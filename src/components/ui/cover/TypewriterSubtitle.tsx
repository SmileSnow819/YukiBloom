/**
 * Typewriter Subtitle Component
 *
 * 为首页 Cover 的 subtitle 添加打字机效果
 * 支持换行符 \n，支持 prefers-reduced-motion 可访问性
 */

import { usePrefersReducedMotion } from '@hooks/index';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

export interface TypewriterSubtitleProps {
  /** 副标题文本，支持 \n 换行 */
  text: string;
  /** 打字机每个字符的间隔时间（毫秒），默认 50 */
  typingSpeed?: number;
  /** 自定义类名 */
  className?: string;
}

function TypewriterSubtitle({ text, typingSpeed = 50, className = '' }: TypewriterSubtitleProps) {
  const [isTyping, setIsTyping] = useState(true);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLParagraphElement | null>(null);

  // 检测用户是否偏好减少动画
  const prefersReducedMotion = usePrefersReducedMotion();

  // 清理动画
  const clearAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 将文本转换为 HTML（处理换行符），并在打字时添加光标
  const textToHtml = useCallback((str: string, showCursor = false) => {
    const html = str.replace(/\n/g, '<br/>');
    return showCursor ? html + '<span class="typewriter-cursor ml-1"></span>' : html;
  }, []);

  // 使用 requestAnimationFrame 的打字机效果
  const startTyping = useCallback(() => {
    if (!containerRef.current) return;

    // 如果用户偏好减少动画，直接显示全部
    if (prefersReducedMotion) {
      containerRef.current.innerHTML = textToHtml(text);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    containerRef.current.innerHTML = '';
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const charIndex = Math.floor(elapsed / typingSpeed);

      if (charIndex < text.length && containerRef.current) {
        const currentText = text.slice(0, charIndex + 1);
        containerRef.current.innerHTML = textToHtml(currentText, true);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (containerRef.current) {
          containerRef.current.innerHTML = textToHtml(text);
        }
        setIsTyping(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [text, typingSpeed, prefersReducedMotion, textToHtml]);

  // 组件挂载时开始打字
  useEffect(() => {
    startTyping();
    return () => clearAnimation();
  }, [startTyping, clearAnimation]);

  return (
    <>
      {/* 屏幕阅读器专用 */}
      <span className="sr-only">{text}</span>

      {/* 视觉展示 */}
      <p ref={containerRef} className={className} aria-hidden="true" />
    </>
  );
}

export default memo(TypewriterSubtitle);
