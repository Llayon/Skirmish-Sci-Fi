import { ToastMessage, ToastType } from '@/context/ToastContext';

type AddToastFn = (toast: Omit<ToastMessage, 'id'>) => void;

class UiService {
    private addToastFn?: AddToastFn;

    registerToastProvider(addToastFn: AddToastFn) {
        this.addToastFn = addToastFn;
    }

    showError(message: string) {
        if (this.addToastFn) {
            this.addToastFn({ message, type: 'error' });
        }
    }

    showToast(message: string, type: ToastType) {
        if (this.addToastFn) {
            this.addToastFn({ message, type });
        }
    }
}

export const uiService = new UiService();