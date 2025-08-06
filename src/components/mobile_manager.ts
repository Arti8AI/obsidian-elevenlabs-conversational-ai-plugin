import { App, Platform } from "obsidian";

export interface MobileSettings {
    touchSensitivity: number;
    swipeGestures: boolean;
    autoHideKeyboard: boolean;
    largerButtons: boolean;
    simplifiedUI: boolean;
    voiceButtonSize: 'small' | 'medium' | 'large';
    enableHapticFeedback: boolean;
}

export interface TouchGesture {
    type: 'tap' | 'longpress' | 'swipe' | 'pinch';
    direction?: 'up' | 'down' | 'left' | 'right';
    callback: (event: TouchEvent) => void;
}

export class MobileManager {
    private app: App;
    private isMobile: boolean;
    private settings: MobileSettings;
    private gestureHandlers: Map<string, TouchGesture> = new Map();
    private touchStartTime: number = 0;
    private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };

    constructor(app: App) {
        this.app = app;
        this.isMobile = Platform.isMobile;
        this.settings = this.getDefaultMobileSettings();
        
        if (this.isMobile) {
            this.initializeMobileOptimizations();
        }
    }

    // Mobile Detection and Setup
    public getIsMobile(): boolean {
        return this.isMobile;
    }

    private getDefaultMobileSettings(): MobileSettings {
        return {
            touchSensitivity: 0.8,
            swipeGestures: true,
            autoHideKeyboard: true,
            largerButtons: true,
            simplifiedUI: true,
            voiceButtonSize: 'large',
            enableHapticFeedback: true
        };
    }

    private initializeMobileOptimizations(): void {
        console.log('Initializing mobile optimizations...');
        
        // Add mobile-specific CSS classes
        document.body.addClass('elevenlabs-mobile');
        
        // Setup viewport meta tag
        this.setupViewport();
        
        // Initialize touch gesture support
        this.initializeTouchGestures();
        
        // Setup mobile-specific event listeners
        this.setupMobileEventListeners();
        
        // Optimize for mobile performance
        this.optimizeForMobilePerformance();
    }

    private setupViewport(): void {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.setAttribute('name', 'viewport');
            document.head.appendChild(viewport);
        }
        
        viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
    }

    // Touch Gesture Management
    private initializeTouchGestures(): void {
        if (!this.settings.swipeGestures) return;
        
        // Register default gestures
        this.registerGesture('swipe-left', {
            type: 'swipe',
            direction: 'left',
            callback: (event) => this.handleSwipeLeft(event)
        });
        
        this.registerGesture('swipe-right', {
            type: 'swipe',
            direction: 'right',
            callback: (event) => this.handleSwipeRight(event)
        });
        
        this.registerGesture('long-press', {
            type: 'longpress',
            callback: (event) => this.handleLongPress(event)
        });
    }

    public registerGesture(id: string, gesture: TouchGesture): void {
        this.gestureHandlers.set(id, gesture);
    }

    public unregisterGesture(id: string): void {
        this.gestureHandlers.delete(id);
    }

    private setupMobileEventListeners(): void {
        // Touch event handlers
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Orientation change handler
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        
        // Keyboard handling for mobile
        if (this.settings.autoHideKeyboard) {
            this.setupKeyboardHandling();
        }
    }

    private handleTouchStart(event: TouchEvent): void {
        this.touchStartTime = Date.now();
        const touch = event.touches[0];
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        // Provide haptic feedback if enabled
        if (this.settings.enableHapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        // Prevent default scrolling in certain areas
        const target = event.target as HTMLElement;
        if (target.closest('.elevenlabs-conversation-modal')) {
            event.preventDefault();
        }
    }

    private handleTouchEnd(event: TouchEvent): void {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - this.touchStartTime;
        const touch = event.changedTouches[0];
        const touchEndPos = { x: touch.clientX, y: touch.clientY };
        
        const deltaX = touchEndPos.x - this.touchStartPos.x;
        const deltaY = touchEndPos.y - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Determine gesture type
        if (touchDuration > 500 && distance < 20) {
            // Long press
            this.executeGesture('long-press', event);
        } else if (distance > 50) {
            // Swipe gesture
            const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            if (isHorizontal) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this.executeGesture(`swipe-${direction}`, event);
            } else {
                const direction = deltaY > 0 ? 'down' : 'up';
                this.executeGesture(`swipe-${direction}`, event);
            }
        }
    }

    private executeGesture(gestureId: string, event: TouchEvent): void {
        const gesture = this.gestureHandlers.get(gestureId);
        if (gesture) {
            gesture.callback(event);
        }
    }

    // Default Gesture Handlers
    private handleSwipeLeft(event: TouchEvent): void {
        const target = event.target as HTMLElement;
        if (target.closest('.elevenlabs-session-history')) {
            // Swipe left on session history to delete
            this.triggerSessionAction('delete', target);
        }
    }

    private handleSwipeRight(event: TouchEvent): void {
        const target = event.target as HTMLElement;
        if (target.closest('.elevenlabs-conversation-modal')) {
            // Swipe right to close modal
            this.triggerModalAction('close');
        }
    }

    private handleLongPress(event: TouchEvent): void {
        const target = event.target as HTMLElement;
        if (target.closest('.elevenlabs-transcript-entry')) {
            // Long press on transcript entry for options
            this.showTranscriptOptions(target, event);
        }
    }

    // Mobile UI Optimizations
    public optimizeModalForMobile(modal: HTMLElement): void {
        if (!this.isMobile) return;
        
        modal.addClass('elevenlabs-mobile-optimized');
        
        // Make buttons larger
        if (this.settings.largerButtons) {
            modal.addClass('elevenlabs-large-buttons');
        }
        
        // Simplify UI if enabled
        if (this.settings.simplifiedUI) {
            modal.addClass('elevenlabs-simplified-ui');
        }
        
        // Adjust voice button size
        const voiceButtons = modal.querySelectorAll('.voice-control-btn');
        voiceButtons.forEach(btn => {
            btn.addClass(`voice-btn-${this.settings.voiceButtonSize}`);
        });
        
        // Add mobile-specific touch areas
        this.addTouchAreas(modal);
    }

    private addTouchAreas(container: HTMLElement): void {
        // Add invisible touch areas for better mobile interaction
        const touchAreas = container.querySelectorAll('[data-touch-area]');
        touchAreas.forEach(area => {
            area.addClass('elevenlabs-touch-area');
            area.addEventListener('touchstart', (e) => {
                area.addClass('touch-active');
                setTimeout(() => area.removeClass('touch-active'), 150);
            });
        });
    }

    // Keyboard and Input Handling
    private setupKeyboardHandling(): void {
        let keyboardVisible = false;
        
        // Detect keyboard show/hide
        const originalHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDiff = originalHeight - currentHeight;
            
            if (heightDiff > 150) {
                // Keyboard is likely visible
                if (!keyboardVisible) {
                    keyboardVisible = true;
                    this.handleKeyboardShow();
                }
            } else {
                // Keyboard is likely hidden
                if (keyboardVisible) {
                    keyboardVisible = false;
                    this.handleKeyboardHide();
                }
            }
        });
    }

    private handleKeyboardShow(): void {
        document.body.addClass('elevenlabs-keyboard-visible');
        
        // Scroll active input into view
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            setTimeout(() => {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }

    private handleKeyboardHide(): void {
        document.body.removeClass('elevenlabs-keyboard-visible');
    }

    // Orientation Handling
    private handleOrientationChange(): void {
        setTimeout(() => {
            // Recalculate layouts after orientation change
            this.optimizeForMobilePerformance();
            
            // Trigger window resize event for components to reposition
            window.dispatchEvent(new Event('resize'));
        }, 500);
    }

    // Performance Optimizations
    private optimizeForMobilePerformance(): void {
        // Reduce animations on lower-end devices
        if (this.isLowEndDevice()) {
            document.body.addClass('elevenlabs-reduced-animations');
        }
        
        // Optimize touch event handling
        this.optimizeTouchEvents();
        
        // Lazy load non-critical elements
        this.setupLazyLoading();
    }

    private isLowEndDevice(): boolean {
        // Simple heuristic for low-end device detection
        const ram = (navigator as any).deviceMemory;
        const cores = navigator.hardwareConcurrency;
        
        return (ram && ram < 4) || (cores && cores < 4);
    }

    private optimizeTouchEvents(): void {
        // Use passive event listeners where possible
        const passiveEvents = ['touchstart', 'touchmove', 'wheel'];
        passiveEvents.forEach(eventName => {
            document.addEventListener(eventName, () => {}, { passive: true });
        });
    }

    private setupLazyLoading(): void {
        // Implement intersection observer for lazy loading
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target as HTMLElement;
                        element.addClass('elevenlabs-loaded');
                        observer.unobserve(element);
                    }
                });
            });
            
            // Observe elements that can be lazy loaded
            const lazyElements = document.querySelectorAll('[data-lazy-load]');
            lazyElements.forEach(el => observer.observe(el));
        }
    }

    // Action Handlers
    private triggerSessionAction(action: string, target: HTMLElement): void {
        const sessionElement = target.closest('[data-session-id]') as HTMLElement;
        if (sessionElement) {
            const sessionId = sessionElement.dataset.sessionId;
            const event = new CustomEvent('mobile-session-action', {
                detail: { action, sessionId }
            });
            document.dispatchEvent(event);
        }
    }

    private triggerModalAction(action: string): void {
        const event = new CustomEvent('mobile-modal-action', {
            detail: { action }
        });
        document.dispatchEvent(event);
    }

    private showTranscriptOptions(target: HTMLElement, touchEvent: TouchEvent): void {
        // Create context menu for transcript entry
        const contextMenu = document.createElement('div');
        contextMenu.className = 'elevenlabs-mobile-context-menu';
        
        const options = [
            { label: 'Copy', action: 'copy' },
            { label: 'Share', action: 'share' },
            { label: 'Save', action: 'save' }
        ];
        
        options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.label;
            button.onclick = () => {
                this.handleTranscriptAction(option.action, target);
                contextMenu.remove();
            };
            contextMenu.appendChild(button);
        });
        
        // Position context menu
        const touch = touchEvent.changedTouches[0];
        contextMenu.style.left = `${touch.clientX - 50}px`;
        contextMenu.style.top = `${touch.clientY - 50}px`;
        
        document.body.appendChild(contextMenu);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (contextMenu.parentNode) {
                contextMenu.remove();
            }
        }, 3000);
    }

    private handleTranscriptAction(action: string, target: HTMLElement): void {
        const transcriptText = target.textContent || '';
        
        switch (action) {
            case 'copy':
                navigator.clipboard?.writeText(transcriptText);
                break;
            case 'share':
                if ('share' in navigator) {
                    (navigator as any).share({
                        title: 'ElevenLabs Conversation',
                        text: transcriptText
                    });
                }
                break;
            case 'save':
                // Trigger save action
                const event = new CustomEvent('save-transcript-entry', {
                    detail: { text: transcriptText }
                });
                document.dispatchEvent(event);
                break;
        }
    }

    // Settings Management
    public updateMobileSettings(newSettings: Partial<MobileSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        
        // Apply settings changes
        if (this.isMobile) {
            this.applySettingsChanges();
        }
    }

    private applySettingsChanges(): void {
        // Update button sizes
        const voiceButtons = document.querySelectorAll('.voice-control-btn');
        voiceButtons.forEach(btn => {
            btn.className = btn.className.replace(/voice-btn-(small|medium|large)/, '');
            btn.addClass(`voice-btn-${this.settings.voiceButtonSize}`);
        });
        
        // Update UI complexity
        document.body.toggleClass('elevenlabs-simplified-ui', this.settings.simplifiedUI);
        document.body.toggleClass('elevenlabs-large-buttons', this.settings.largerButtons);
    }

    public getMobileSettings(): MobileSettings {
        return { ...this.settings };
    }

    // Cleanup
    public cleanup(): void {
        if (this.isMobile) {
            document.body.removeClass(
                'elevenlabs-mobile',
                'elevenlabs-keyboard-visible',
                'elevenlabs-reduced-animations',
                'elevenlabs-simplified-ui',
                'elevenlabs-large-buttons'
            );
            
            // Remove mobile context menus
            const contextMenus = document.querySelectorAll('.elevenlabs-mobile-context-menu');
            contextMenus.forEach(menu => menu.remove());
        }
    }

    // Utility Methods
    public isTouchDevice(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    public getScreenSize(): 'small' | 'medium' | 'large' {
        const width = window.innerWidth;
        if (width < 480) return 'small';
        if (width < 768) return 'medium';
        return 'large';
    }

    public isLandscape(): boolean {
        return window.innerWidth > window.innerHeight;
    }

    public supportsHapticFeedback(): boolean {
        return 'vibrate' in navigator && this.settings.enableHapticFeedback;
    }
}