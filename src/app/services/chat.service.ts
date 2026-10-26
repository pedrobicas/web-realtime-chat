import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

// Use global SockJS and Stomp from CDN
declare const SockJS: any;
declare const Stomp: any;

export interface ChatMessage {
  id?: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'SYSTEM_ANNOUNCEMENT' | 'ERROR' | 'PRIVATE_MESSAGE';
  content?: string;
  sender?: string;
  recipient?: string;
  timestamp?: Date;
  formattedTime?: string;
  onlineCount?: number;
  mentions?: string[];
  color?: string;
  avatar?: string;
  isPrivate?: boolean;
}

export interface User {
  username: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  typing?: boolean;
  color?: string;
  avatar?: string;
}

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private stompClient: any = null;
  private socket: any = null;
  private connected = false;
  private reconnectInterval: any = null;
  private username: string = '';
  private guestToken: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private connectionAttempt = 0;
  private manuallyDisconnected = false;

  // Observables
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private usersSubject = new BehaviorSubject<User[]>([]);
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    status: 'disconnected',
    message: 'Desconectado'
  });
  private typingSubject = new Subject<{ sender: string; isTyping: boolean }>();
  private notificationsSubject = new Subject<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }>();
  private privateMessageSubject = new Subject<ChatMessage>();

  // Public observables
  public messages$ = this.messagesSubject.asObservable();
  public users$ = this.usersSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public typing$ = this.typingSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();
  public privateMessages$ = this.privateMessageSubject.asObservable();

  constructor() {}

  connect(username: string): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;
    this.manuallyDisconnected = false;
    this.username = username;
    const attempt = ++this.connectionAttempt;
    this.connectionPromise = this.connectInternal(username, attempt).finally(() => {
      if (attempt === this.connectionAttempt) this.connectionPromise = null;
    });
    return this.connectionPromise;
  }

  private async ensureGuestIdentity(username: string, attempt: number): Promise<string> {
    const tokenKey = 'chat-guest-token';
    const userKey = 'chat-guest-username';
    const savedUsername = sessionStorage.getItem(userKey);
    const savedToken = savedUsername === username ? sessionStorage.getItem(tokenKey) : null;
    const response = await fetch(`${environment.apiUrl}/chat/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token: savedToken })
    });
    if (!response.ok) {
      if (response.status === 409) throw new Error('Nome de usuário já está em uso');
      throw new Error(`Falha ao iniciar sessão: HTTP ${response.status}`);
    }
    const credentials: { username: string; token: string } = await response.json();
    if (attempt !== this.connectionAttempt) {
      this.releaseGuestIdentity(credentials.token);
      throw new Error('Conexão cancelada');
    }
    this.guestToken = credentials.token;
    sessionStorage.setItem(tokenKey, credentials.token);
    sessionStorage.setItem(userKey, credentials.username);
    return credentials.token;
  }

  private async connectInternal(username: string, attempt: number): Promise<void> {
    this.updateConnectionStatus('connecting', 'Conectando...');
    let token: string;
    try {
      token = await this.ensureGuestIdentity(username, attempt);
    } catch (error) {
      if (attempt === this.connectionAttempt) {
        this.updateConnectionStatus('disconnected', 'Falha ao iniciar sessão');
      }
      throw error;
    }
    if (attempt !== this.connectionAttempt) throw new Error('Conexão cancelada');
    return new Promise<void>((resolve, reject) => {
      try {
        const socket = new SockJS(environment.wsUrl);
        this.socket = socket;
        const client = Stomp.over(socket);
        this.stompClient = client;
        client.debug = null;
        client.connect({ Authorization: `Bearer ${token}` },
          () => {
            if (attempt !== this.connectionAttempt) {
              client.disconnect();
              reject(new Error('Conexão cancelada'));
              return;
            }
            this.onConnected();
            resolve();
          },
          (error: any) => {
            if (attempt === this.connectionAttempt) this.onError(error);
            reject(error);
          }
        );
      } catch (error) {
        if (attempt === this.connectionAttempt) this.onError(error);
        reject(error);
      }
    });
  }

  private onConnected(): void {
    this.connected = true;
    this.updateConnectionStatus('connected', 'Conectado');

    // Subscribe to topics
    this.stompClient.subscribe('/topic/public', (message: any) => {
      this.onMessageReceived(message);
    });

    this.stompClient.subscribe('/topic/users', (message: any) => {
      this.onUsersUpdated(message);
    });

    this.stompClient.subscribe('/topic/typing', (message: any) => {
      this.onTypingReceived(message);
    });

    this.stompClient.subscribe('/user/queue/mention', (message: any) => {
      this.onMentionReceived(message);
    });

    this.stompClient.subscribe('/user/queue/history', (message: any) => {
      this.onHistoryReceived(message);
    });
    this.stompClient.subscribe('/user/queue/error', (message: any) => {
      this.processMessage(JSON.parse(message.body));
    });

    // Every *new WebSocket session* must register, including after reconnect.
    // Old history messages do not prove that this connection has joined.
    const joinMessage: ChatMessage = { type: 'JOIN', sender: this.username };
    this.stompClient.send('/app/chat.addUser', {}, JSON.stringify(joinMessage));

    // Clear reconnection interval
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    this.showNotification('Conectado com sucesso!', 'success');
  }

  private onError(error: any): void {
    if (this.manuallyDisconnected) return;
    console.error('Connection error:', error);
    this.connected = false;
    this.updateConnectionStatus('disconnected', 'Erro de conexão');

    this.showNotification('Erro de conexão. Tentando reconectar...', 'error');

    // Auto reconnect
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        if (this.username && !this.connected &&
            this.connectionStatusSubject.value.status !== 'connecting') {
          this.connect(this.username).catch(() => {
            // onError already updates status; next retry is scheduled.
          });
        }
      }, 5000);
    }
  }

  private onMessageReceived(payload: any): void {
    const message: ChatMessage = JSON.parse(payload.body);
    this.processMessage(message);
  }

  private onUsersUpdated(payload: any): void {
    const users: User[] = JSON.parse(payload.body);
    this.usersSubject.next(users);
  }

  private onTypingReceived(payload: any): void {
    const message = JSON.parse(payload.body);
    if (message.sender && message.sender !== this.username) {
      this.typingSubject.next({ sender: message.sender, isTyping: true });
      
      // Auto hide typing indicator after 3 seconds
      setTimeout(() => {
        this.typingSubject.next({ sender: message.sender, isTyping: false });
      }, 3000);
    }
  }

  private onPrivateMessageReceived(payload: any): void {
    const message: ChatMessage = JSON.parse(payload.body);
    console.log('Mensagem privada recebida:', message);
    
    // Emitir evento para o PrivateChatService processar
    this.privateMessageSubject.next(message);
  }

  private onMentionReceived(payload: any): void {
    const message = JSON.parse(payload.body);
    this.showNotification(`${message.sender} mencionou você`, 'info');
  }

  private onHistoryReceived(payload: any): void {
    const messages: ChatMessage[] = JSON.parse(payload.body);
    // O histórico pode chegar depois de mensagens ao vivo: conciliar por ID e ordenar.
    const combined = [...this.messagesSubject.value, ...messages];
    const unique = new Map<string, ChatMessage>();
    for (const message of combined) {
      if (message.type === 'PRIVATE_MESSAGE' || message.isPrivate) continue;
      const key = message.id || `${message.type}:${message.sender}:${message.timestamp}:${message.content}`;
      if (!unique.has(key)) unique.set(key, message);
    }
    this.messagesSubject.next([...unique.values()].sort((a, b) =>
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    ));
  }

  private processMessage(message: ChatMessage, isPrivate = false): void {
    if (message.type === 'ERROR') {
      this.showNotification(message.content || 'Erro desconhecido', 'error');

      if (message.content?.includes('já está em uso')) {
        this.disconnect();
        this.showNotification('Nome de usuário já está em uso', 'error');
      }
      return;
    }

    // IDs vem do servidor: mensagens no mesmo segundo nao sao descartadas indevidamente.
    const currentMessages = this.messagesSubject.value;
    const exists = currentMessages.some(existing => existing.id && existing.id === message.id);
    if (!exists) this.messagesSubject.next([...currentMessages, message]);
  }

  sendMessage(content: string): void {
    if (!this.connected || !this.stompClient) return;

    const message: ChatMessage = {
      type: 'CHAT',
      content: content,
      sender: this.username
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(message));
  }

  sendPrivateMessage(content: string, recipient: string): void {
    if (!this.connected || !this.stompClient) return;

    const message: ChatMessage = {
      type: 'PRIVATE_MESSAGE',
      content: content,
      sender: this.username,
      recipient: recipient,
      isPrivate: true
    };

    this.stompClient.send('/app/chat.private', {}, JSON.stringify(message));
  }

  sendTyping(): void {
    if (this.connected && this.stompClient) {
      const typingMessage = {
        sender: this.username,
        timestamp: new Date().toISOString()
      };
      this.stompClient.send('/app/chat.typing', {}, JSON.stringify(typingMessage));
    }
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.connectionAttempt++;
    this.connectionPromise = null;
    const token = this.guestToken;
    this.guestToken = null;
    sessionStorage.removeItem('chat-guest-token');
    sessionStorage.removeItem('chat-guest-username');
    if (token) this.releaseGuestIdentity(token);
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect();
    } else if (this.socket) {
      this.socket.close();
    }
    this.stompClient = null;
    this.socket = null;
    this.connected = false;
    this.updateConnectionStatus('disconnected', 'Desconectado');
    
    // Limpar mensagens e usuários ao desconectar
    this.messagesSubject.next([]);
    this.usersSubject.next([]);
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  private releaseGuestIdentity(token: string): void {
    void fetch(`${environment.apiUrl}/chat/session`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, keepalive: true
    }).catch(() => { /* Network loss: server expiry is the fallback. */ });
  }

  private updateConnectionStatus(status: ConnectionStatus['status'], message: string): void {
    this.connectionStatusSubject.next({ status, message });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.notificationsSubject.next({ message, type });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getUsername(): string {
    return this.username;
  }
}
