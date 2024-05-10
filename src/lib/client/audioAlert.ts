export const audioAlert = (text: string) => window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
