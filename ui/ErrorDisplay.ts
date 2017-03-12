namespace Cursive {
    export class ErrorDisplay {
        private readonly popup: EditorPopup;

        constructor(popup: EditorPopup) {
            this.popup = popup;
        }
        showError(message: string) {
            this.popup.popupContent.innerHTML = '<h3>An error has occurred</h3><p>Sorry. You might need to reload the page to continue.</p><p>The following error was encountered - you might want to report this:</p><pre>' + message + '</pre>';
        }
    }
}