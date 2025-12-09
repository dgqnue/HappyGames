'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import SystemDialog from '@/components/SystemDialog';

export interface SystemDialogData {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    icon?: React.ReactNode;
}

interface SystemDialogContextType {
    showDialog: (data: SystemDialogData) => void;
    hideDialog: () => void;
    showSuccess: (title: string, message: string) => void;
    showError: (title: string, message: string) => void;
    showWarning: (title: string, message: string) => void;
    showInfo: (title: string, message: string) => void;
    showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const SystemDialogContext = createContext<SystemDialogContextType | null>(null);

interface SystemDialogProviderProps {
    children: ReactNode;
}

export function SystemDialogProvider({ children }: SystemDialogProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dialogData, setDialogData] = useState<SystemDialogData | null>(null);

    const showDialog = (data: SystemDialogData) => {
        setDialogData(data);
        setIsOpen(true);
    };

    const hideDialog = () => {
        setIsOpen(false);
        setDialogData(null);
    };

    const showSuccess = (title: string, message: string) => {
        showDialog({
            title,
            message,
            type: 'success',
            confirmText: '知道了',
            showCancel: false
        });
    };

    const showError = (title: string, message: string) => {
        showDialog({
            title,
            message,
            type: 'error',
            confirmText: '知道了',
            showCancel: false
        });
    };

    const showWarning = (title: string, message: string) => {
        showDialog({
            title,
            message,
            type: 'warning',
            confirmText: '知道了',
            showCancel: false
        });
    };

    const showInfo = (title: string, message: string) => {
        showDialog({
            title,
            message,
            type: 'info',
            confirmText: '知道了',
            showCancel: false
        });
    };

    const showConfirm = (
        title: string, 
        message: string, 
        onConfirm: () => void, 
        onCancel?: () => void
    ) => {
        showDialog({
            title,
            message,
            type: 'warning',
            confirmText: '确认',
            cancelText: '取消',
            showCancel: true,
            onConfirm,
            onCancel
        });
    };

    const handleClose = () => {
        if (dialogData?.onCancel) {
            dialogData.onCancel();
        }
        hideDialog();
    };

    const handleConfirm = () => {
        if (dialogData?.onConfirm) {
            dialogData.onConfirm();
        }
        hideDialog();
    };

    const contextValue: SystemDialogContextType = {
        showDialog,
        hideDialog,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm
    };

    return (
        <SystemDialogContext.Provider value={contextValue}>
            {children}
            {dialogData && (
                <SystemDialog
                    isOpen={isOpen}
                    onClose={handleClose}
                    title={dialogData.title}
                    message={dialogData.message}
                    type={dialogData.type}
                    confirmText={dialogData.confirmText}
                    cancelText={dialogData.cancelText}
                    showCancel={dialogData.showCancel}
                    onConfirm={handleConfirm}
                    onCancel={handleClose}
                    icon={dialogData.icon}
                />
            )}
        </SystemDialogContext.Provider>
    );
}

export function useSystemDialog(): SystemDialogContextType {
    const context = useContext(SystemDialogContext);
    if (!context) {
        throw new Error('useSystemDialog must be used within a SystemDialogProvider');
    }
    return context;
}