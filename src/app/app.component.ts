import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from './components/chat/chat.component';
import { PrivateChatService } from './services/private-chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Real Time Chat';

  constructor(private privateChatService: PrivateChatService) {}

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('chat-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}
