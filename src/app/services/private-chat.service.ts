import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ChatMessage, User, ChatService } from './chat.service';

export interface PrivateConversation {
  id: string;
  participants: string[];
  messages: ChatMessage[];
  unreadCount: number;
  lastMessage?: ChatMessage;
  isActive: boolean;
}

export interface PrivateMessage extends ChatMessage {
  recipient: string;
  isPrivate: true;
}

@Injectable({
  providedIn: 'root'
})
export class PrivateChatService {
  private conversationsSubject = new BehaviorSubject<Map<string, PrivateConversation>>(new Map());
  private activeConversationSubject = new BehaviorSubject<string | null>(null);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private panelVisible = false;

  // Observables públicos
  public conversations$ = this.conversationsSubject.asObservable();
  public activeConversation$ = this.activeConversationSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private chatService: ChatService) {
    // Subscrever a mensagens privadas do ChatService
    this.chatService.privateMessages$.subscribe((message: ChatMessage) => {
      this.handleIncomingPrivateMessage(message);
    });
  }

  /**
   * Iniciar uma nova conversa privada
   */
  startConversation(participant1: string, participant2: string): string {
    const conversationId = this.generateConversationId(participant1, participant2);
    
    if (!this.conversationsSubject.value.has(conversationId)) {
      const newConversation: PrivateConversation = {
        id: conversationId,
        participants: [participant1, participant2].sort(),
        messages: [],
        unreadCount: 0,
        isActive: false
      };

      const conversations = new Map(this.conversationsSubject.value);
      conversations.set(conversationId, newConversation);
      this.conversationsSubject.next(conversations);
    }

    return conversationId;
  }

  /**
   * Adicionar mensagem privada à conversa
   */
  addPrivateMessage(conversationId: string, message: PrivateMessage): void {
    const conversations = new Map(this.conversationsSubject.value);
    const conversation = conversations.get(conversationId);

    if (conversation) {
      conversation.messages.push(message);
      conversation.lastMessage = message;
      
      // Incrementar contador de não lidas se não for a conversa ativa OU o painel não está visível
      if (conversation.id !== this.activeConversationSubject.value || !this.panelVisible) {
        conversation.unreadCount++;
        this.updateTotalUnreadCount();
      }

      conversations.set(conversationId, conversation);
      this.conversationsSubject.next(conversations);
    }
  }

  /**
   * Marcar conversa como ativa
   */
  setActiveConversation(conversationId: string): void {
    const conversations = new Map(this.conversationsSubject.value);
    const conversation = conversations.get(conversationId);

    if (conversation) {
      // Marcar conversa anterior como inativa
      const previousActive = this.activeConversationSubject.value;
      if (previousActive && conversations.has(previousActive)) {
        const prevConversation = conversations.get(previousActive)!;
        prevConversation.isActive = false;
        conversations.set(previousActive, prevConversation);
      }

      // Marcar nova conversa como ativa
      conversation.isActive = true;
      conversation.unreadCount = 0;
      conversations.set(conversationId, conversation);
      
      this.activeConversationSubject.next(conversationId);
      this.conversationsSubject.next(conversations);
      this.updateTotalUnreadCount();
    }
  }

  /**
   * Definir visibilidade do painel de chat privado (para contagem de não lidas)
   */
  setVisible(visible: boolean): void {
    this.panelVisible = visible;
    if (visible) {
      const activeId = this.activeConversationSubject.value;
      if (activeId) {
        this.markConversationAsRead(activeId);
      }
    }
  }

  /**
   * Obter conversa por ID
   */
  getConversation(conversationId: string): PrivateConversation | undefined {
    return this.conversationsSubject.value.get(conversationId);
  }

  /**
   * Obter conversa entre dois usuários
   */
  getConversationBetweenUsers(user1: string, user2: string): PrivateConversation | undefined {
    const conversationId = this.generateConversationId(user1, user2);
    return this.conversationsSubject.value.get(conversationId);
  }

  /**
   * Obter todas as conversas de um usuário
   */
  getUserConversations(username: string): PrivateConversation[] {
    const conversations = Array.from(this.conversationsSubject.value.values());
    return conversations.filter(conv => 
      conv.participants.includes(username)
    );
  }

  /**
   * Marcar mensagens como lidas
   */
  markConversationAsRead(conversationId: string): void {
    const conversations = new Map(this.conversationsSubject.value);
    const conversation = conversations.get(conversationId);

    if (conversation) {
      conversation.unreadCount = 0;
      conversations.set(conversationId, conversation);
      this.conversationsSubject.next(conversations);
      this.updateTotalUnreadCount();
    }
  }

  /**
   * Remover conversa
   */
  removeConversation(conversationId: string): void {
    const conversations = new Map(this.conversationsSubject.value);
    conversations.delete(conversationId);
    
    if (this.activeConversationSubject.value === conversationId) {
      this.activeConversationSubject.next(null);
    }
    
    this.conversationsSubject.next(conversations);
    this.updateTotalUnreadCount();
  }

  /**
   * Limpar todas as conversas
   */
  clearAllConversations(): void {
    this.conversationsSubject.next(new Map());
    this.activeConversationSubject.next(null);
    this.unreadCountSubject.next(0);
  }

  /**
   * Obter contador total de mensagens não lidas
   */
  getTotalUnreadCount(): number {
    const conversations = Array.from(this.conversationsSubject.value.values());
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }

  /**
   * Verificar se há conversas não lidas
   */
  hasUnreadConversations(): boolean {
    return this.getTotalUnreadCount() > 0;
  }

  /**
   * Gerar ID único para conversa entre dois usuários
   */
  private generateConversationId(user1: string, user2: string): string {
    const sortedUsers = [user1, user2].sort();
    return `private_${sortedUsers[0]}_${sortedUsers[1]}`;
  }

  /**
   * Atualizar contador total de não lidas
   */
  private updateTotalUnreadCount(): void {
    const totalUnread = this.getTotalUnreadCount();
    this.unreadCountSubject.next(totalUnread);
  }

  /**
   * Obter nome do outro participante da conversa
   */
  getOtherParticipant(conversationId: string, currentUser: string): string | null {
    const conversation = this.getConversation(conversationId);
    if (conversation) {
      const otherParticipant = conversation.participants.find(p => p !== currentUser);
      return otherParticipant || null;
    }
    return null;
  }

  /**
   * Verificar se uma conversa existe
   */
  conversationExists(conversationId: string): boolean {
    return this.conversationsSubject.value.has(conversationId);
  }

  /**
   * Obter conversas ordenadas por última mensagem
   */
  getConversationsSortedByLastMessage(username: string): PrivateConversation[] {
    const userConversations = this.getUserConversations(username);
    return userConversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      
      const timeA = new Date(a.lastMessage.timestamp || 0).getTime();
      const timeB = new Date(b.lastMessage.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Lidar com mensagem privada recebida
   */
  private handleIncomingPrivateMessage(message: ChatMessage): void {
    if (message.type !== 'PRIVATE_MESSAGE' || !message.sender || !message.recipient) {
      return;
    }

    // Determinar o usuário atual (receptor da mensagem)
    const currentUser = message.recipient;
    const sender = message.sender;

    // Encontrar ou criar conversa
    let conversation = this.getConversationBetweenUsers(currentUser, sender);
    if (!conversation) {
      const conversationId = this.startConversation(currentUser, sender);
      conversation = this.getConversation(conversationId);
    }

    if (conversation) {
      // Adicionar mensagem à conversa
      const privateMessage: PrivateMessage = {
        type: message.type,
        content: message.content,
        sender: message.sender,
        recipient: message.recipient!,
        timestamp: message.timestamp,
        formattedTime: message.formattedTime,
        color: message.color,
        avatar: message.avatar,
        isPrivate: true
      };

      this.addPrivateMessage(conversation.id, privateMessage);
    }
  }

  /**
   * Enviar mensagem privada através do ChatService
   */
  sendPrivateMessage(content: string, sender: string, recipient: string): void {
    // Usar o ChatService para enviar a mensagem
    this.chatService.sendPrivateMessage(content, recipient);
    // Não adicionar localmente para evitar duplicação; o servidor ecoa para ambos
  }
}
