/**
 * UI/UX Testing - Kiểm tra các tính năng UI/UX đã triển khai
 */

describe('UI/UX Features Testing', () => {
  
  describe('Design System', () => {
    test('should have design system CSS file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const designSystemPath = path.join(__dirname, '../assets/css/design-system.css');
      expect(fs.existsSync(designSystemPath)).toBe(true);
    });

    test('should have color variables defined', () => {
      const fs = require('fs');
      const path = require('path');
      
      const designSystemPath = path.join(__dirname, '../assets/css/design-system.css');
      const cssContent = fs.readFileSync(designSystemPath, 'utf8');
      
      expect(cssContent).toContain('--primary-500');
      expect(cssContent).toContain('--secondary-500');
      expect(cssContent).toContain('--success-500');
      expect(cssContent).toContain('--warning-500');
      expect(cssContent).toContain('--error-500');
    });

    test('should have typography scale', () => {
      const fs = require('fs');
      const path = require('path');
      
      const designSystemPath = path.join(__dirname, '../assets/css/design-system.css');
      const cssContent = fs.readFileSync(designSystemPath, 'utf8');
      
      expect(cssContent).toContain('--text-xs');
      expect(cssContent).toContain('--text-sm');
      expect(cssContent).toContain('--text-base');
      expect(cssContent).toContain('--text-lg');
      expect(cssContent).toContain('--text-xl');
    });
  });

  describe('Mobile Navigation', () => {
    test('should have mobile navigation component', () => {
      const fs = require('fs');
      const path = require('path');
      
      const mobileNavPath = path.join(__dirname, '../components/mobile-nav.html');
      expect(fs.existsSync(mobileNavPath)).toBe(true);
    });

    test('should have hamburger menu functionality', () => {
      const fs = require('fs');
      const path = require('path');
      
      const mobileNavPath = path.join(__dirname, '../components/mobile-nav.html');
      const htmlContent = fs.readFileSync(mobileNavPath, 'utf8');
      
      expect(htmlContent).toContain('hamburger-btn');
      expect(htmlContent).toContain('toggleMobileMenu');
      expect(htmlContent).toContain('mobile-menu');
    });
  });

  describe('Swipe Gestures', () => {
    test('should have swipe gestures JavaScript file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const swipePath = path.join(__dirname, '../components/ui/swipe-gestures.js');
      expect(fs.existsSync(swipePath)).toBe(true);
    });

    test('should have touch event listeners', () => {
      const fs = require('fs');
      const path = require('path');
      
      const swipePath = path.join(__dirname, '../components/ui/swipe-gestures.js');
      const jsContent = fs.readFileSync(swipePath, 'utf8');
      
      expect(jsContent).toContain('touchstart');
      expect(jsContent).toContain('touchmove');
      expect(jsContent).toContain('touchend');
      expect(jsContent).toContain('onSwipeRight');
      expect(jsContent).toContain('onSwipeLeft');
    });
  });

  describe('Camera Integration', () => {
    test('should have camera integration component', () => {
      const fs = require('fs');
      const path = require('path');
      
      const cameraPath = path.join(__dirname, '../components/ui/camera-integration.html');
      expect(fs.existsSync(cameraPath)).toBe(true);
    });

    test('should have getUserMedia API usage', () => {
      const fs = require('fs');
      const path = require('path');
      
      const cameraPath = path.join(__dirname, '../components/ui/camera-integration.html');
      const htmlContent = fs.readFileSync(cameraPath, 'utf8');
      
      expect(htmlContent).toContain('getUserMedia');
      expect(htmlContent).toContain('cameraModal');
      expect(htmlContent).toContain('capturePhoto');
    });
  });

  describe('Voice Notes', () => {
    test('should have voice notes component', () => {
      const fs = require('fs');
      const path = require('path');
      
      const voicePath = path.join(__dirname, '../components/ui/voice-notes.html');
      expect(fs.existsSync(voicePath)).toBe(true);
    });

    test('should have MediaRecorder API usage', () => {
      const fs = require('fs');
      const path = require('path');
      
      const voicePath = path.join(__dirname, '../components/ui/voice-notes.html');
      const htmlContent = fs.readFileSync(voicePath, 'utf8');
      
      expect(htmlContent).toContain('MediaRecorder');
      expect(htmlContent).toContain('voiceNotesModal');
      expect(htmlContent).toContain('startRecording');
    });
  });

  describe('Real-time Collaboration', () => {
    test('should have real-time collaboration JavaScript', () => {
      const fs = require('fs');
      const path = require('path');
      
      const realtimePath = path.join(__dirname, '../components/ui/realtime-collaboration.js');
      expect(fs.existsSync(realtimePath)).toBe(true);
    });

    test('should have WebSocket implementation', () => {
      const fs = require('fs');
      const path = require('path');
      
      const realtimePath = path.join(__dirname, '../components/ui/realtime-collaboration.js');
      const jsContent = fs.readFileSync(realtimePath, 'utf8');
      
      expect(jsContent).toContain('WebSocket');
      expect(jsContent).toContain('connect');
      expect(jsContent).toContain('sendMessage');
    });
  });

  describe('Management Pages', () => {
    test('should have new users management page', () => {
      const fs = require('fs');
      const path = require('path');
      
      const usersPath = path.join(__dirname, '../pages/users-management-new.html');
      expect(fs.existsSync(usersPath)).toBe(true);
    });

    test('should have new tasks management page', () => {
      const fs = require('fs');
      const path = require('path');
      
      const tasksPath = path.join(__dirname, '../pages/tasks-management-new.html');
      expect(fs.existsSync(tasksPath)).toBe(true);
    });

    test('should have new projects management page', () => {
      const fs = require('fs');
      const path = require('path');
      
      const projectsPath = path.join(__dirname, '../pages/projects-management-new.html');
      expect(fs.existsSync(projectsPath)).toBe(true);
    });

    test('should have new OKRs management page', () => {
      const fs = require('fs');
      const path = require('path');
      
      const okrsPath = path.join(__dirname, '../pages/okrs-management-new.html');
      expect(fs.existsSync(okrsPath)).toBe(true);
    });
  });

  describe('Mobile-First Features', () => {
    test('should have pull-to-refresh functionality', () => {
      const fs = require('fs');
      const path = require('path');
      
      const pullRefreshPath = path.join(__dirname, '../components/ui/pull-to-refresh.js');
      expect(fs.existsSync(pullRefreshPath)).toBe(true);
    });

    test('should have infinite scroll functionality', () => {
      const fs = require('fs');
      const path = require('path');
      
      const infiniteScrollPath = path.join(__dirname, '../components/ui/infinite-scroll.js');
      expect(fs.existsSync(infiniteScrollPath)).toBe(true);
    });

    test('should have keyboard shortcuts component', () => {
      const fs = require('fs');
      const path = require('path');
      
      const shortcutsPath = path.join(__dirname, '../components/ui/keyboard-shortcuts.html');
      expect(fs.existsSync(shortcutsPath)).toBe(true);
    });
  });

  describe('UI Components', () => {
    test('should have button components', () => {
      const fs = require('fs');
      const path = require('path');
      
      const buttonsPath = path.join(__dirname, '../components/ui/buttons.html');
      expect(fs.existsSync(buttonsPath)).toBe(true);
    });

    test('should have card components', () => {
      const fs = require('fs');
      const path = require('path');
      
      const cardsPath = path.join(__dirname, '../components/ui/cards.html');
      expect(fs.existsSync(cardsPath)).toBe(true);
    });

    test('should have form components', () => {
      const fs = require('fs');
      const path = require('path');
      
      const formsPath = path.join(__dirname, '../components/ui/forms.html');
      expect(fs.existsSync(formsPath)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should have all management pages linked to design system', () => {
      const fs = require('fs');
      const path = require('path');
      
      const pages = [
        '../pages/users-management-new.html',
        '../pages/tasks-management-new.html', 
        '../pages/projects-management-new.html',
        '../pages/okrs-management-new.html'
      ];

      pages.forEach(pagePath => {
        const fullPath = path.join(__dirname, pagePath);
        const htmlContent = fs.readFileSync(fullPath, 'utf8');
        
        expect(htmlContent).toContain('design-system.css');
        expect(htmlContent).toContain('mobile-nav.html');
      });
    });

    test('should have mobile features integrated in all pages', () => {
      const fs = require('fs');
      const path = require('path');
      
      const pages = [
        '../pages/users-management-new.html',
        '../pages/tasks-management-new.html',
        '../pages/projects-management-new.html', 
        '../pages/okrs-management-new.html'
      ];

      pages.forEach(pagePath => {
        const fullPath = path.join(__dirname, pagePath);
        const htmlContent = fs.readFileSync(fullPath, 'utf8');
        
        expect(htmlContent).toContain('swipe-gestures.js');
        expect(htmlContent).toContain('pull-to-refresh.js');
        expect(htmlContent).toContain('infinite-scroll.js');
      });
    });
  });
});
