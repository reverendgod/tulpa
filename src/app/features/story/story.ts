import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Feedback } from '../../core/services/data/data';
import { ParallaxDirective } from '../../shared/directives/parallax'; 

@Component({
  selector: 'app-story',
  standalone: true,
  imports: [CommonModule, ParallaxDirective],
  templateUrl: './story.html',
  styleUrls: ['./story.css']
})
export class StoryComponent {
  private dataService = inject(DataService);

  isSubmitting = false;
  notification: { type: 'success' | 'error' | null, text: string } = { type: null, text: '' };
  private lastSubmissionTime: number | null = null;
  private readonly submissionCooldown = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const lastSubmission = localStorage.getItem('lastSubmissionTime');
    if (lastSubmission) {
      this.lastSubmissionTime = +lastSubmission;
    }
  }

  // ИСПРАВЛЕНО: Теперь метод находится СТРОГО внутри класса StoryComponent
  onSubmit(event: Event) {
    event.preventDefault();

    if (this.isSubmitting) {
      return;
    }

    if (this.lastSubmissionTime && (Date.now() - this.lastSubmissionTime < this.submissionCooldown)) {
      const remainingTime = Math.ceil((this.submissionCooldown - (Date.now() - this.lastSubmissionTime)) / 1000 / 60);
      this.showNotification('error', `Вы можете отправить следующую заявку через ${remainingTime} минут.`);
      return;
    }
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Убираем обертку "payload", отправляем чистый объект напрямую
    const feedbackData = {
      id: 0,
      name: formData.get('name')?.toString() || '',
      contact: formData.get('contact')?.toString() || '',
      message: formData.get('message')?.toString() || '',
      createdAt: new Date().toISOString()
    };

    if (!feedbackData.name || !feedbackData.contact) {
      this.showNotification('error', 'Пожалуйста, заполните имя и контакты для связи.');
      return;
    }

    this.isSubmitting = true;
    this.showNotification('success', 'Отправка...'); // Neutral 'sending' message

    // ИСПРАВЛЕНО: передаем напрямую feedbackData, а не payload
    this.dataService.sendFeedback(feedbackData as any).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.lastSubmissionTime = Date.now();
        localStorage.setItem('lastSubmissionTime', this.lastSubmissionTime.toString());
        this.showNotification('success', 'Заявка успешно отправлена! Я свяжусь с вами в ближайшее время.');
        form.reset();
      },
      error: (err: any) => {
        console.error('Не удалось отправить заявку:', err);
        this.isSubmitting = false;
        this.showNotification('error', 'Ошибка при отправке. Пожалуйста, попробуйте позже или свяжитесь со мной другим способом.');
      }
    });
  }

  showNotification(type: 'success' | 'error', text: string) {
    this.notification = { type, text };

    // Do not auto-clear the 'Sending...' message
    if (text === 'Отправка...') {
      return;
    }

    setTimeout(() => {
      this.notification = { type: null, text: '' };
    }, 7000); // Notification will disappear after 7 seconds
  }
}