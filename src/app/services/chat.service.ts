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
  private connected = false;
  private reconnectInterval: any = null;
  private username: string = '';

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
    return new Promise((resolve, reject) => {
      this.username = username;
      this.updateConnectionStatus('connecting', 'Conectando...');

      try {
        const socket = new SockJS(`${environment.wsUrl}?username=${encodeURIComponent(this.username)}`);
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null; // Disable console logs

        this.stompClient.connect({},
          () => {
            this.onConnected();
            resolve();
          },
          (error: any) => {
            this.onError(error);
            reject(error);
          }
        );
      } catch (error) {
        this.onError(error);
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

    // Add user to chat - apenas se não estiver já conectado
    const currentMessages = this.messagesSubject.value;
    const alreadyJoined = currentMessages.some(msg => 
      msg.type === 'JOIN' && msg.sender === this.username
    );
    
    if (!alreadyJoined) {
      const joinMessage: ChatMessage = {
        type: 'JOIN',
        sender: this.username
      };

      this.stompClient.send('/app/chat.addUser', {}, JSON.stringify(joinMessage));
    }

    // Clear reconnection interval
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    this.showNotification('Conectado com sucesso!', 'success');
  }

  private onError(error: any): void {
    console.error('Connection error:', error);
    this.connected = false;
    this.updateConnectionStatus('disconnected', 'Erro de conexão');

    this.showNotification('Erro de conexão. Tentando reconectar...', 'error');

    // Auto reconnect
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        if (this.username && !this.connected) {
          this.connect(this.username).catch(console.error);
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
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect();
    }
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
