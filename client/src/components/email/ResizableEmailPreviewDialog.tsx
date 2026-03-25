import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Mail, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';

interface ResizableEmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    merchantName?: string;
  }>;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function ResizableEmailPreviewDialog({
  open,
  onOpenChange,
  emails,
  onConfirm,
  isLoading = false,
}: ResizableEmailPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sanitizedHtml, setSanitizedHtml] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? window.innerWidth / 2 - 600 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 - 300 : 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Reset index when dialog opens and center position
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      // Center the dialog on screen
      setPosition({
        x: window.innerWidth / 2 - 600,
        y: window.innerHeight / 2 - 300,
      });
      console.log('Preview dialog opened with emails:', emails);
    }
  }, [open, emails]);

  // Sanitize HTML when email changes
  useEffect(() => {
    if (!open || emails.length === 0 || currentIndex >= emails.length) {
      setSanitizedHtml('');
      return;
    }

    const currentEmail = emails[currentIndex];
    console.log('Current email:', currentEmail);
    if (!currentEmail?.html) {
      setSanitizedHtml('');
      return;
    }

    const temp = document.createElement('div');
    temp.innerHTML = currentEmail.html;
    const scripts = temp.querySelectorAll('script, style, iframe');
    scripts.forEach(el => el.remove());
    setSanitizedHtml(temp.innerHTML);
  }, [open, currentIndex, emails]);

  const handleNext = () => {
    if (currentIndex < emails.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emails[currentIndex].to);
    toast.success('邮箱地址已复制');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-draggable-handle]')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    if (isResizing) {
      const newWidth = Math.max(600, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(400, resizeStart.height + (e.clientY - resizeStart.y));
      setDimensions({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height,
    });
  };

  if (!open || emails.length === 0) {
    return null;
  }

  const currentEmail = emails[currentIndex];
  const hasNext = currentIndex < emails.length - 1;
  const hasPrev = currentIndex > 0;

  // Maximized mode - full width, fixed height
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col" style={{ width: '100vw', height: '800px', maxHeight: '90vh' }}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                邮件预览（全屏）
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                共 {emails.length} 封邮件，当前预览第 {currentIndex + 1} 封
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col gap-4 p-4">
            {/* Email Navigation */}
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex-1 text-center">
              <p className="text-sm font-medium text-slate-700">
                {currentEmail.subject || '邮件主题'}
              </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-hidden flex flex-col gap-2">
              {/* Subject */}
              <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-1">邮件主题</p>
                <p className="text-sm font-medium text-slate-900 break-words">
                  {currentEmail.subject}
                </p>
              </div>

              {/* Recipients */}
              <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2">收件人</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {currentEmail.to}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyEmail}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-lg bg-white">
                <p className="text-xs font-medium text-slate-600 px-4 py-2 border-b border-slate-200">
                  邮件内容预览
                </p>
                <div className="flex-1 overflow-auto">
                  <div className="p-4">
                    <div
                      className="rich-text-editor-content prose prose-sm prose-table prose-ul prose-ol prose-li prose-a prose-code prose-pre prose-h1 prose-h2 prose-h3 prose-h4 prose-h5 prose-h6 max-w-none text-slate-900"
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {sanitizedHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                      ) : (
                        <p className="text-slate-500">邮件内容为空</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-slate-50">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button onClick={onConfirm} disabled={isLoading}>
              {isLoading ? '发送中...' : '确认发送'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Normal mode - draggable and resizable window
  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header - Draggable */}
      <div
        className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between"
        data-draggable-handle
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <div>
            <h2 className="font-semibold text-slate-900">邮件预览</h2>
            <p className="text-xs text-slate-500">
              共 {emails.length} 封邮件，当前预览第 {currentIndex + 1} 封
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col gap-4 p-4">
        {/* Email Navigation */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-slate-700">
              {currentEmail.subject || '邮件主题'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-hidden flex flex-col gap-2">
          {/* Subject */}
          <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">邮件主题</p>
            <p className="text-sm font-medium text-slate-900 break-words">
              {currentEmail.subject}
            </p>
          </div>

          {/* Recipients */}
          <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">收件人</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {currentEmail.to}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyEmail}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Email Body */}
          <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-lg bg-white">
            <p className="text-xs font-medium text-slate-600 px-4 py-2 border-b border-slate-200">
              邮件内容预览
            </p>
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                    <div
                      className="rich-text-editor-content prose prose-sm prose-table prose-ul prose-ol prose-li prose-a prose-code prose-pre prose-h1 prose-h2 prose-h3 prose-h4 prose-h5 prose-h6 max-w-none text-slate-900"
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {sanitizedHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                      ) : (
                        <p className="text-slate-500">邮件内容为空</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          取消
        </Button>
        <Button onClick={onConfirm} disabled={isLoading}>
          {isLoading ? '发送中...' : '确认发送'}
        </Button>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 bg-slate-300 cursor-se-resize rounded-bl-lg hover:bg-slate-400 transition-colors"
        onMouseDown={handleResizeStart}
        title="拖动调整大小"
      />
    </div>
  );
}
