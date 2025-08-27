import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage, User, ConnectionStatus } from '../../services/chat.service';

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

  // Data
  messages: ChatMessage[] = [];
  users: User[] = [];
  connectionStatus: ConnectionStatus = { status: 'disconnected', message: 'Desconectado' };
  typingUsers: Set<string> = new Set();
  notifications: Array<{ id: number; message: string; type: string }> = [];

  // UI State
  showWelcome = true;
  showSidebar = false;
  showEmojiPicker = false;
  showScrollButton = false;
  currentTheme = 'dark';
  username = '';
  messageText = '';
  notificationId = 0;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Emojis
  emojis = ['😀', '😂', '😍', '🤔', '😎', '😢', '😡', '😴', '🎉', '❤️', '👍', '👎', '🔥', '💯', '🚀', '⚡'];

  // Array reference for template
  Array = Array;

  constructor(public chatService: ChatService) {}

  ngOnInit(): void {
    this.loadTheme();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.chatService.disconnect();
  }

  ngAfterViewChecked(): void {
    // Only auto-scroll if user is near bottom
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
      })
    );
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

    if (!/^[a-zA-Z0-9_-]+$/.test(this.username)) {
      this.showNotification('Use apenas letras, números, _ e -', 'warning');
      return;
    }

    try {
      await this.chatService.connect(this.username);
      this.showWelcome = false;
      setTimeout(() => {
        this.messageInput?.nativeElement?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }

  sendMessage(): void {
    const content = this.messageText.trim();
    if (!content || !this.chatService.isConnected()) return;

    this.chatService.sendMessage(content);
    this.messageText = '';
    this.adjustTextareaHeight();
  }

  onMessageInput(event: any): void {
    this.adjustTextareaHeight();
    this.chatService.sendTyping();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  adjustTextareaHeight(): void {
    const textarea = this.messageInput?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  insertEmoji(emoji: string): void {
    const textarea = this.messageInput?.nativeElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;

      textarea.value = text.substring(0, start) + emoji + text.substring(end);
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      this.messageText = textarea.value;
      this.adjustTextareaHeight();
    }
    this.showEmojiPicker = false;
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
  }

  loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    this.currentTheme = savedTheme;
    document.body.setAttribute('data-theme', savedTheme);
  }

  scrollToBottom(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  onScroll(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
      this.showScrollButton = !isNearBottom;
    }
  }

  private shouldAutoScroll(): boolean {
    if (!this.messagesContainer) return true;
    const container = this.messagesContainer.nativeElement;
    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
    return isNearBottom;
  }

  showNotification(message: string, type: string): void {
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

  isOwnMessage(message: ChatMessage): boolean {
    return message.sender === this.chatService.getUsername();
  }

  isSystemMessage(message: ChatMessage): boolean {
    return ['JOIN', 'LEAVE', 'SYSTEM_ANNOUNCEMENT'].includes(message.type);
  }

  getStatusText(status?: string): string {
    const statusMap: { [key: string]: string } = {
      'online': 'Online',
      'away': 'Ausente',
      'busy': 'Ocupado',
      'offline': 'Offline'
    };
    return statusMap[status || 'online'] || 'Online';
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'connected': 'connected',
      'connecting': 'connecting',
      'disconnected': 'disconnected'
    };
    return statusMap[status] || 'disconnected';
  }
}
