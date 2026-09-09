import "@fontsource/anton/latin-400.css";
import "./style.css";
import { Game } from "./Game";
const root = document.querySelector<HTMLDivElement>("#app")!;
try {
  new Game(root, document.querySelector<HTMLCanvasElement>("#world")!);
} catch (error) {
  root.innerHTML =
    '<main class="fallback"><span class="eyebrow">AN UNEXPECTED TECHNICALITY</span><h1>The campus needs WebGL.</h1><p>Enable hardware acceleration or open this game in a modern browser, then reload.</p><button onclick="location.reload()">Try again ↻</button></main>';
  console.error(error);
}
