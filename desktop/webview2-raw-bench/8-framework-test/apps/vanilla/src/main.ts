import screen from './screen.html?raw';
import { mount } from './controller';
document.getElementById('app')!.innerHTML = screen;
mount();
