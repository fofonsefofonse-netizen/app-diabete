import { createContext, useContext } from 'react';
import type { ToastType } from '../hooks/useToast';

export const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export const useToastContext = () => useContext(ToastContext);
