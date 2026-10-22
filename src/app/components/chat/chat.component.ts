import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage, User, ConnectionStatus } from '../../services/chat.service';
import { PrivateChatService, PrivateConversation } from '../../services/private-chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  users: User[] = [];
  connectionStatus: ConnectionStatus = { status: 'disconnected', message: 'Desconectado' };
  typingUsers: Set<string> = new Set();
  notifications: Array<{ id: number; message: string; type: string }> = [];

  showWelcome = true;
  showSidebar = false;
  showEmojiPicker = false;
  showScrollButton = false;
  currentTheme = 'dark';
  username = '';
  messageText = '';
  notificationId = 0;

  showPrivateChat = false;
  privateChatUnreadCount = 0;
  activePrivateConversation: string | null = null;
  privateMessageText = '';
  privateConversations: PrivateConversation[] = [];
  showConversationTab = false;
  sidebarSearch = '';
  collapseFavorites = false;
  collapseConversations = false;
  collapseUsers = false;
  private pinnedSet: Set<string> = new Set(); 

  private subscriptions: Subscription[] = [];

  emojis = ['😀', '😂', '😍', '🤔', '😎', '😢', '😡', '😴', '🎉', '❤️', '👍', '👎', '🔥', '💯', '🚀', '⚡'];



  constructor(
    public chatService: ChatService,
    private privateChatService: PrivateChatService
  ) {}

  ngOnInit(): void {
    this.loadTheme();
    this.loadPinned();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.chatService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll()) {
      this.scrollToBottom();
    }
  }

  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.chatService.messages$.subscribe(messages => {
        this.messages = messages;
      }),

      this.chatService.users$.subscribe(users => {
        this.users = users;
      }),

      this.chatService.connectionStatus$.subscribe(status => {
        this.connectionStatus = status;
      }),

      this.chatService.typing$.subscribe(({ sender, isTyping }) => {
        if (isTyping) {
          this.typingUsers.add(sender);
        } else {
          this.typingUsers.delete(sender);
        }
      }),

      this.chatService.notifications$.subscribe(({ message, type }) => {
        this.showNotification(message, type);
        if (type === 'error' && (message.includes('já está em uso') || message.includes('Identidade de sessao'))) {
          this.showWelcome = true;
        }
      }),

      this.privateChatService.unreadCount$.subscribe(count => {
        this.privateChatUnreadCount = count;
      }),

      this.privateChatService.conversations$.subscribe(map => {
        this.privateConversations = Array.from(map.values());
      }),

      this.chatService.privateMessages$.subscribe(() => {
        if (this.showPrivateChat) {
          setTimeout(() => this.scrollToBottom(), 0);
        }
      })
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showPrivateChat) {
      this.closePrivateConversation();
    }
  }

  async joinChat(): Promise<void> {
    if (!this.username.trim()) {
      this.showNotification('Por favor, digite um nome de usuário', 'warning');
      return;
    }

    if (this.username.length > 30) {
      this.showNotification('Nome muito longo (máximo 30 caracteres)', 'warning');
      return;
    }

    try {
      await this.chatService.connect(this.username);
      this.showWelcome = false;
      this.focusMessageInput();
    } catch (error) {
      console.error('Erro ao conectar:', error);
      this.showNotification('Erro ao conectar ao chat', 'error');
    }
  }

  sendMessage(): void {
    if (!this.messageText.trim()) return;

    this.chatService.sendMessage(this.messageText);
    this.messageText = '';
    this.focusMessageInput();
    setTimeout(() => this.scrollToBottom(), 0);
  }

  sendTyping(): void {
    if (this.connectionStatus.status === 'connected') {
      this.chatService.sendTyping();
    }
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    if (this.showPrivateChat) {
      this.privateMessageText += emoji;
    } else {
      this.messageText += emoji;
    }
    this.showEmojiPicker = false;
    this.focusMessageInput();
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
  }

  scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  shouldAutoScroll(): boolean {
    if (!this.messagesContainer) return false;
    
    const element = this.messagesContainer.nativeElement;
    const threshold = 100;
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }

  private focusMessageInput(): void {
    setTimeout(() => {
      if (this.showPrivateChat) {
        const privateInput = document.querySelector('#privateMessageInput') as HTMLTextAreaElement;
        if (privateInput) {
          privateInput.focus();
        }
      } else if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem('chat-theme');
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    localStorage.setItem('chat-theme', this.currentTheme);
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  private showNotification(message: string, type: string): void {
    const notification = {
      id: ++this.notificationId,
      message,
      type
    };

    this.notifications.push(notification);

    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== notification.id);
    }, 5000);
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  togglePrivateChat(): void {
    this.showPrivateChat = !this.showPrivateChat;
    
    if (!this.showPrivateChat) {
      this.privateChatService.setActiveConversation('');
      this.activePrivateConversation = null;
      this.showEmojiPicker = false; 
    }
  }

  switchToPublic(): void {
    if (this.showPrivateChat) {
      this.closePrivateConversation();
    }
  }

  switchToPrivate(): void {
    if (!this.showPrivateChat && this.activePrivateConversation) {
      this.showPrivateChat = true;
      this.showSidebar = false;
      this.privateChatService.setVisible(true);
      this.focusMessageInput();
    }
  }

  startPrivateConversation(username: string): void {
    const conversationId = this.privateChatService.startConversation(this.username, username);
    this.privateChatService.setActiveConversation(conversationId);
    this.activePrivateConversation = username;
    this.showPrivateChat = true;
    this.showEmojiPicker = false;
    this.privateChatService.setVisible(true);
    
    setTimeout(() => {
      const privateInput = document.querySelector('#privateMessageInput') as HTMLTextAreaElement;
      if (privateInput) {
        privateInput.focus();
      }
    }, 100);
    setTimeout(() => this.scrollToBottom(), 0);
  }

  closePrivateConversation(): void {
    this.activePrivateConversation = null;
    this.showPrivateChat = false;
    this.privateMessageText = '';
    this.privateChatService.setActiveConversation('');
    this.showEmojiPicker = false;
    this.privateChatService.setVisible(false);
  }

  sendPrivateMessage(): void {
    if (!this.privateMessageText.trim() || !this.activePrivateConversation) return;

    this.privateChatService.sendPrivateMessage(
      this.privateMessageText, 
      this.username, 
      this.activePrivateConversation
    );
    this.privateMessageText = '';
    this.showPrivateChat = true;
    setTimeout(() => this.scrollToBottom(), 0);
  }

  getPrivateConversation(): any {
    if (!this.activePrivateConversation) return null;
    return this.privateChatService.getConversationBetweenUsers(
      this.username, 
      this.activePrivateConversation
    );
  }

  getPrivateMessages(): any[] {
    const conversation = this.getPrivateConversation();
    return conversation ? conversation.messages : [];
  }

  getOtherParticipantFromConv(conversationId: string): string {
    return this.privateChatService.getOtherParticipant(conversationId, this.username) || '';
  }

  get filteredUsers(): User[] {
    const term = this.sidebarSearch.trim().toLowerCase();
    const base = this.users;
    if (!term) return base;
    return base.filter(u => (u.username || '').toLowerCase().includes(term));
  }

  get sortedPrivateConversations(): PrivateConversation[] {
    return [...this.privateConversations].sort((a, b) => {
      const ta = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const tb = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return tb - ta;
    });
  }

  get filteredConversations(): PrivateConversation[] {
    const term = this.sidebarSearch.trim().toLowerCase();
    const list = this.sortedPrivateConversations;
    if (!term) return list;
    return list.filter(c => this.getOtherParticipantFromConv(c.id).toLowerCase().includes(term));
  }

  get favoriteConversations(): PrivateConversation[] {
    return this.sortedPrivateConversations.filter(c => this.isPinned(this.getOtherParticipantFromConv(c.id)));
  }

  get recentConversations(): PrivateConversation[] {
    return this.sortedPrivateConversations.filter(c => !this.isPinned(this.getOtherParticipantFromConv(c.id)));
  }

  isPinned(username: string): boolean {
    return this.pinnedSet.has(username);
  }

  togglePin(username: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (this.pinnedSet.has(username)) {
      this.pinnedSet.delete(username);
    } else {
      this.pinnedSet.add(username);
    }
    this.savePinned();
  }

  private loadPinned(): void {
    try {
      const raw = localStorage.getItem('chat-pins');
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        this.pinnedSet = new Set(arr);
      }
    } catch {}
  }

  private savePinned(): void {
    try {
      localStorage.setItem('chat-pins', JSON.stringify(Array.from(this.pinnedSet)));
    } catch {}
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'connected': return 'connected';
      case 'connecting': return 'connecting';
      case 'disconnected': return 'disconnected';
      default: return 'disconnected';
    }
  }

  getConnectionStatusClass(): string {
    const status = this.connectionStatus.status;
    if (status === 'connected' || status === 'connecting' || status === 'disconnected') {
      return status;
    }
    return 'disconnected';
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Ausente';
      case 'busy': return 'Ocupado';
      case 'offline': return 'Offline';
      default: return 'Online';
    }
  }

  onScroll(): void {
    this.shouldAutoScroll();
  }

  isOwnMessage(message: any): boolean {
    return message.sender === this.username;
  }

  isSystemMessage(message: any): boolean {
    return message.type === 'JOIN' || message.type === 'LEAVE' || message.type === 'SYSTEM_ANNOUNCEMENT';
  }

  private typingTimeout: any = null;

  onMessageInput(event: any): void {
    const target = event.target;
    if (target) {
      target.style.height = 'auto';
      target.style.height = target.scrollHeight + 'px';
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.typingTimeout = setTimeout(() => {
      if (this.connectionStatus.status === 'connected') {
        this.sendTyping();
      }
    }, 500);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.showPrivateChat) {
        this.sendPrivateMessage();
      } else {
        this.sendMessage();
      }
    }
  }

  insertEmoji(emoji: string): void {
    if (this.showPrivateChat) {
      this.privateMessageText += emoji;
    } else {
      this.messageText += emoji;
    }
    this.showEmojiPicker = false;
    this.focusMessageInput();
  }

  getTypingUsersText(): string {
    return Array.from(this.typingUsers).join(', ');
  }
}
