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
        addField(name: string) {
            let row = document.createElement('label');
            row.className = 'row';
            this.popupContent.appendChild(row);

            if (name !== null) {
                let label = document.createElement('span');
                label.className = 'label';
                label.innerText = name;
                row.appendChild(label);
            }

            let wrapper = document.createElement('span');
            wrapper.className = 'value';
            row.appendChild(wrapper);

            return row;
        }
        static showError(element: HTMLElement, message: string) {
            element.classList.add('error');
            let messageElement = document.createElement('div');
            messageElement.innerText = message;
            messageElement.className = 'errorMessage';
            element.parentElement.appendChild(messageElement);
        }
        static clearErrors(root: HTMLElement) {
            let errorElements = root.querySelectorAll('.error');
            for (let i = 0; i < errorElements.length; i++)
                errorElements[i].classList.remove('error');

            let errorMessages = root.querySelectorAll('.errorMessage');
            for (let i = 0; i < errorMessages.length; i++) {
                let message = errorMessages[i];
                message.parentElement.removeChild(message);
            }
        }
    }
}