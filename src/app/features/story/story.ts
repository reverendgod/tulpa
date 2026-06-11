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

  // ИСПРАВЛЕНО: Теперь метод находится СТРОГО внутри класса StoryComponent
 onSubmit(event: Event) {
    event.preventDefault();
    
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
    this.notification.type = null;

    // ИСПРАВЛЕНО: передаем напрямую feedbackData, а не payload
    this.dataService.sendFeedback(feedbackData as any).subscribe({
      next: (res: any) => {
        this.showNotification('success', 'Заявка успешно отправлена! Я свяжусь с вами в ближайшее время.');
        form.reset();
        this.isSubmitting = false;
      },
      error: (err: any) => {
        console.error('Не удалось отправить заявку:', err);
        this.showNotification('error', 'Ошибка отправки! Попробуйте позже.');
        this.isSubmitting = false;
      }
    });
  }

  showNotification(type: 'success' | 'error', text: string) {
    this.notification = { type, text };
    setTimeout(() => {
      this.notification = { type: null, text: '' };
    }, 5000); // Уведомление исчезнет через 5 секунд
  }
}