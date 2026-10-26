import { ChatMessage, ChatService, ConnectionStatus } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let client: any;
  let subscriptions: Map<string, (payload: any) => void>;
  let failConnection: (error: any) => void;
  let fetchSpy: jasmine.Spy;
  let originalSockJS: any;
  let originalStomp: any;
  let savedToken: string | null;
  let savedUsername: string | null;

  beforeEach(() => {
    savedToken = sessionStorage.getItem('chat-guest-token');
    savedUsername = sessionStorage.getItem('chat-guest-username');
    sessionStorage.removeItem('chat-guest-token');
    sessionStorage.removeItem('chat-guest-username');
    originalSockJS = window.SockJS;
    originalStomp = window.Stomp;
    subscriptions = new Map();
    client = {
      connect: jasmine.createSpy('connect').and.callFake((_headers: any, connected: () => void, failed: (error: any) => void) => {
        failConnection = failed;
        connected();
      }),
      subscribe: jasmine.createSpy('subscribe').and.callFake((destination: string, callback: (payload: any) => void) => {
        subscriptions.set(destination, callback);
      }),
      send: jasmine.createSpy('send'),
      disconnect: jasmine.createSpy('disconnect')
    };
    window.SockJS = jasmine.createSpy('SockJS').and.returnValue({ close: jasmine.createSpy('close') });
    window.Stomp = { over: () => client };
    fetchSpy = spyOn(window, 'fetch').and.resolveTo({
      ok: true,
      json: async () => ({ username: 'alice', token: 'guest-token' })
    } as Response);
    spyOn(console, 'error');
    service = new ChatService();
  });

  afterEach(() => {
    service.disconnect();
    window.SockJS = originalSockJS;
    window.Stomp = originalStomp;
    for (const [key, value] of [['chat-guest-token', savedToken], ['chat-guest-username', savedUsername]]) {
      if (value === null) sessionStorage.removeItem(key!);
      else sessionStorage.setItem(key!, value!);
    }
  });

  function receive(destination: string, value: unknown): void {
    const callback = subscriptions.get(destination);
    expect(callback).withContext(`subscription ${destination}`).toBeDefined();
    callback!({ body: JSON.stringify(value) });
  }

  it('reserves and releases the guest through the actual API route', async () => {
    await service.connect('alice');
    expect(fetchSpy.calls.first().args[0]).toBe('/api/chat/session');
    expect(client.connect.calls.first().args[0]).toEqual({ Authorization: 'Bearer guest-token' });
    service.disconnect();
    expect(fetchSpy.calls.mostRecent().args).toEqual(['/api/chat/session', jasmine.objectContaining({
      method: 'DELETE', headers: { Authorization: 'Bearer guest-token' }
    })]);
  });

  it('subscribes to session errors exactly once', async () => {
    await service.connect('alice');
    const errorSubscriptions = client.subscribe.calls.allArgs().filter((args: any[]) => args[0] === '/user/queue/error');
    expect(errorSubscriptions.length).toBe(1);
  });

  it('resumes the token and sends JOIN on every new transport connection', async () => {
    await service.connect('alice');
    failConnection(new Error('transport lost'));
    await service.connect('alice');
    const request = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
    expect(request).toEqual({ username: 'alice', token: 'guest-token' });
    expect(client.send.calls.allArgs().filter((args: any[]) => args[0] === '/app/chat.addUser').length).toBe(2);
    expect(service.isConnected()).toBeTrue();
  });

  it('returns to disconnected when the guest reservation is rejected', async () => {
    fetchSpy.and.resolveTo({ ok: false, status: 409 } as Response);
    let status: ConnectionStatus | undefined;
    const subscription = service.connectionStatus$.subscribe(value => status = value);
    await expectAsync(service.connect('alice')).toBeRejectedWithError('Nome de usuário já está em uso');
    expect(status!.status).toBe('disconnected');
    expect(client.connect).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('allows retry after a failed guest request', async () => {
    fetchSpy.and.rejectWith(new Error('offline'));
    await expectAsync(service.connect('alice')).toBeRejected();
    fetchSpy.and.resolveTo({ ok: true, json: async () => ({ username: 'alice', token: 'new-token' }) } as Response);
    await service.connect('alice');
    expect(service.isConnected()).toBeTrue();
  });

  it('ignores and releases guest credentials received after logout', async () => {
    let completeRequest!: (response: Response) => void;
    fetchSpy.and.returnValue(new Promise<Response>(resolve => completeRequest = resolve));
    const connecting = service.connect('alice');
    const cancelled = expectAsync(connecting).toBeRejectedWithError('Conexão cancelada');
    service.disconnect();
    completeRequest({ ok: true, json: async () => ({ username: 'alice', token: 'late-token' }) } as Response);
    await cancelled;
    expect(client.connect).not.toHaveBeenCalled();
    expect(service.isConnected()).toBeFalse();
    expect(sessionStorage.getItem('chat-guest-token')).toBeNull();
    expect(fetchSpy.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
      method: 'DELETE', headers: { Authorization: 'Bearer late-token' }
    }));
  });

  it('closes a late STOMP connection after logout without sending JOIN', async () => {
    let connected!: () => void;
    let transportStarted!: () => void;
    const started = new Promise<void>(resolve => transportStarted = resolve);
    client.connect.and.callFake((_headers: any, callback: () => void) => {
      connected = callback;
      transportStarted();
    });
    const connecting = service.connect('alice');
    const cancelled = expectAsync(connecting).toBeRejectedWithError('Conexão cancelada');
    await started;
    service.disconnect();
    connected();
    await cancelled;
    expect(client.disconnect).toHaveBeenCalled();
    expect(client.send).not.toHaveBeenCalled();
    expect(service.isConnected()).toBeFalse();
  });

  it('merges delayed public history chronologically without duplicates or private messages', async () => {
    await service.connect('alice');
    let messages: ChatMessage[] = [];
    const subscription = service.messages$.subscribe(value => messages = value);
    const early = { id: 'early', type: 'CHAT', content: 'first', timestamp: '2026-10-26T10:00:00' };
    const live = { id: 'live', type: 'CHAT', content: 'second', timestamp: '2026-10-26T10:01:00' };
    receive('/topic/public', live);
    receive('/user/queue/history', [early, live,
      { id: 'private', type: 'PRIVATE_MESSAGE', content: 'secret' },
      { id: 'flagged', type: 'CHAT', content: 'also secret', isPrivate: true }
    ]);
    expect(messages.map(message => message.id)).toEqual(['early', 'live']);
    subscription.unsubscribe();
  });

  it('keeps distinct server IDs even when content and timestamps are equal', async () => {
    await service.connect('alice');
    let messages: ChatMessage[] = [];
    const subscription = service.messages$.subscribe(value => messages = value);
    const message = { type: 'CHAT', sender: 'bob', content: 'hello', timestamp: '2026-10-26T10:00:00' };
    receive('/topic/public', { ...message, id: 'one' });
    receive('/topic/public', { ...message, id: 'two' });
    receive('/topic/public', { ...message, id: 'one' });
    expect(messages.map(value => value.id)).toEqual(['one', 'two']);
    subscription.unsubscribe();
  });
});
