import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BackgroundService {
  // Сигнал хранит текущее состояние фона (цвет или URL картинки)
  currentBackground = signal<string>('rgba(22, 16, 29, 1)');

  updateBackground(newBg: string) {
    this.currentBackground.set(newBg);
  }
}