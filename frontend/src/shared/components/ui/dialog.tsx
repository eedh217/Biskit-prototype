import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContext = React.createContext<{ onClose: () => void } | null>(null);

export function Dialog({ open, onOpenChange, children }: DialogProps): JSX.Element | null {
  if (!open) return null;

  return (
    <DialogContext.Provider value={{ onClose: () => onOpenChange(false) }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => onOpenChange(false)}
        />
        {children}
      </div>
    </DialogContext.Provider>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps): JSX.Element {
  const context = React.useContext(DialogContext);

  return (
    <div
      className={cn(
        'relative z-50 w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg',
        className
      )}
      {...props}
    >
      {context && (
        <button
          type="button"
          onClick={context.onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">닫기</span>
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  children,
  ...props
}: DialogHeaderProps): JSX.Element {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
  ...props
}: DialogTitleProps): JSX.Element {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
  ...props
}: DialogDescriptionProps): JSX.Element {
  return (
    <p className={cn('text-sm text-gray-500 mt-2', className)} {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({
  className,
  children,
  ...props
}: DialogFooterProps): JSX.Element {
  return (
    <div className={cn('mt-6 flex justify-end gap-2', className)} {...props}>
      {children}
    </div>
  );
}
