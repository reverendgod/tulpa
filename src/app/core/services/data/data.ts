import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Photo {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
}

// Вернули интерфейс, который требуют админка и стори
export interface Feedback {
  id: number;
  name: string;
  contact: string;
  message: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  // 1. Старый рабочий метод получения фоток (без изменений)
  getPhotos(): Observable<Photo[]> {
    return this.http.get<Photo[]>(`${this.baseUrl}/photos`);
  }

  // 2. Вернули метод загрузки фоток для Админки
  uploadPhoto(file: File, title: string): Observable<Photo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    return this.http.post<Photo>(`${this.baseUrl}/photos/upload`, formData);
  }

  // 3. Вернули метод отправки заявки из формы
  sendFeedback(feedbackData: Feedback): Observable<any> {
    return this.http.post(`${this.baseUrl}/feedbacks`, feedbackData);
  }

  // 4. Вернули метод получения списка заявок для админки
  getFeedbacks(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.baseUrl}/feedbacks`);
  }
}