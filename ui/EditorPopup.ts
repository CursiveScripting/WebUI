namespace Cursive {
    export class EditorPopup {
        private readonly rootElement: HTMLElement;
        readonly popupContent: HTMLDivElement;
        
        constructor(popupRoot: HTMLElement) {
            this.rootElement = popupRoot;
            this.rootElement.className = 'popupOverlay';
            this.rootElement.addEventListener('click', this.hide.bind(this));

            let popupPanel = document.createElement('div');
            popupPanel.className = 'popupPanel';
            this.rootElement.appendChild(popupPanel);
            popupPanel.addEventListener('click', this.cancelEventBubble.bind(this));

            this.popupContent = document.createElement('div');
            popupPanel.appendChild(this.popupContent);
            
            this.hide();
        }
        show() {
            this.rootElement.style.display = '';
        }
        hide() {
            this.rootElement.style.display = 'none';
        }
        private cancelEventBubble(e: MouseEvent) {
            e.cancelBubble = true;
        }
        static showError(element: HTMLElement, message: string) {
            element.classList.add('error');
            let messageElement = document.createElement('div');
            messageElement.innerText = message;
            messageElement.className = 'errorMessage';
            element.parentElement.appendChild(messageElement);
        }
    }
}