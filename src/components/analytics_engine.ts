import { App, TFile, moment } from "obsidian";

export interface AnalyticsData {
    usage: UsageMetrics;
    content: ContentMetrics;
    performance: PerformanceMetrics;
    insights: AIInsights;
    recommendations: Recommendation[];
    trends: TrendData[];
}

export interface UsageMetrics {
    totalConversations: number;
    averageSessionLength: number;
    mostUsedCommands: { command: string; count: number }[];
    timeDistribution: { hour: number; sessions: number }[];
    weeklyActivity: { week: string; sessions: number }[];
    userProductivity: {
        notesCreated: number;
        notesEdited: number;
        searchQueries: number;
        averageResponseTime: number;
    };
}

export interface ContentMetrics {
    vaultGrowth: { date: string; noteCount: number; wordCount: number }[];
    contentTypes: { type: string; count: number; percentage: number }[];
    tagEvolution: { tag: string; usage: { date: string; count: number }[] }[];
    linkDensity: { note: string; incomingLinks: number; outgoingLinks: number }[];
    contentQuality: {
        averageNoteLength: number;
        orphanedNotes: number;
        duplicateContent: number;
        incompleteNotes: number;
    };
}

export interface PerformanceMetrics {
    searchLatency: { query: string; latency: number; timestamp: Date }[];
    embeddingBuildTime: number[];
    cacheEfficiency: { hitRate: number; timestamp: Date }[];
    memoryUsage: { usage: number; timestamp: Date }[];
    errorRates: { type: string; count: number; lastOccurrence: Date }[];
}

export interface AIInsights {
    vaultHealth: {
        score: number;
        factors: { name: string; score: number; impact: string }[];
    };
    contentPatterns: {
        writingStyle: string;
        commonTopics: string[];
        knowledgeGaps: string[];
        expertiseAreas: string[];
    };
    usagePatterns: {
        peakHours: number[];
        preferredCommands: string[];
        sessionLengthTrend: 'increasing' | 'decreasing' | 'stable';
        productivityTrend: 'improving' | 'declining' | 'stable';
    };
}

export interface Recommendation {
    id: string;
    type: 'organization' | 'workflow' | 'content' | 'performance';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    impact: string;
    estimatedTime: string;
    implemented?: boolean;
    timestamp: Date;
}

export interface TrendData {
    metric: string;
    data: { x: string | number; y: number }[];
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
}

export class AnalyticsEngine {
    private app: App;
    private data: AnalyticsData;
    private sessionStartTime: number = 0;
    private currentCommands: string[] = [];
    private isTracking = false;

    constructor(app: App) {
        this.app = app;
        this.data = this.initializeAnalyticsData();
        this.loadStoredData();
    }

    // Core Analytics Methods
    public startTracking(): void {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.sessionStartTime = Date.now();
        this.currentCommands = [];
        
        // Track session start
        this.trackEvent('session_start', {});
        
        console.log('Analytics tracking started');
    }

    public stopTracking(): void {
        if (!this.isTracking) return;
        
        const sessionLength = Date.now() - this.sessionStartTime;
        this.data.usage.averageSessionLength = this.calculateNewAverage(
            this.data.usage.averageSessionLength,
            sessionLength,
            this.data.usage.totalConversations
        );
        
        this.data.usage.totalConversations++;
        this.trackEvent('session_end', { duration: sessionLength });
        
        this.isTracking = false;
        this.saveData();
        
        console.log(`Analytics tracking stopped. Session length: ${sessionLength}ms`);
    }

    public trackEvent(eventType: string, data: any): void {
        const timestamp = new Date();
        
        switch (eventType) {
            case 'command_used':
                this.trackCommandUsage(data.command);
                break;
            case 'search_performed':
                this.trackSearchPerformance(data.query, data.latency, data.results);
                break;
            case 'note_created':
                this.trackNoteCreation(data.title, data.wordCount);
                break;
            case 'note_edited':
                this.trackNoteEdit(data.title, data.wordCount);
                break;
            case 'error_occurred':
                this.trackError(data.type, data.message);
                break;
            case 'performance_metric':
                this.trackPerformanceMetric(data.metric, data.value);
                break;
        }
        
        // Update time distribution
        this.updateTimeDistribution(timestamp);
        
        // Generate insights periodically
        if (this.data.usage.totalConversations % 10 === 0) {
            this.generateInsights();
        }
    }

    // Insight Generation
    private generateInsights(): void {
        this.data.insights = {
            vaultHealth: this.calculateVaultHealth(),
            contentPatterns: this.analyzeContentPatterns(),
            usagePatterns: this.analyzeUsagePatterns()
        };
        
        this.data.recommendations = this.generateRecommendations();
        this.data.trends = this.calculateTrends();
        
        this.saveData();
    }

    private calculateVaultHealth(): AIInsights['vaultHealth'] {
        const factors = [
            {
                name: 'Organization',
                score: this.calculateOrganizationScore(),
                impact: 'Affects findability and navigation'
            },
            {
                name: 'Connectivity',
                score: this.calculateConnectivityScore(),
                impact: 'Improves knowledge discovery'
            },
            {
                name: 'Content Quality',
                score: this.calculateContentQualityScore(),
                impact: 'Enhances information value'
            },
            {
                name: 'Maintenance',
                score: this.calculateMaintenanceScore(),
                impact: 'Reduces technical debt'
            }
        ];
        
        const overallScore = factors.reduce((sum, factor) => sum + factor.score, 0) / factors.length;
        
        return { score: Math.round(overallScore), factors };
    }

    private analyzeContentPatterns(): AIInsights['contentPatterns'] {
        const files = this.app.vault.getMarkdownFiles();
        const allContent = files.map(f => ({ name: f.name, size: f.stat.size }));
        
        // Analyze writing style based on note length and structure
        const avgLength = allContent.reduce((sum, note) => sum + note.size, 0) / allContent.length;
        const writingStyle = avgLength > 2000 ? 'detailed' : avgLength > 500 ? 'moderate' : 'concise';
        
        // Extract common topics from note titles and content
        const commonTopics = this.extractCommonTopics(files);
        
        // Identify knowledge gaps (areas with few notes)
        const knowledgeGaps = this.identifyKnowledgeGaps(files);
        
        // Identify expertise areas (heavily documented topics)
        const expertiseAreas = this.identifyExpertiseAreas(files);
        
        return { writingStyle, commonTopics, knowledgeGaps, expertiseAreas };
    }

    private analyzeUsagePatterns(): AIInsights['usagePatterns'] {
        const peakHours = this.calculatePeakHours();
        const preferredCommands = this.getTopCommands(5);
        const sessionLengthTrend = this.calculateSessionTrend();
        const productivityTrend = this.calculateProductivityTrend();
        
        return { peakHours, preferredCommands, sessionLengthTrend, productivityTrend };
    }

    private generateRecommendations(): Recommendation[] {
        const recommendations: Recommendation[] = [];
        const timestamp = new Date();
        
        // Organization recommendations
        if (this.data.content.contentQuality.orphanedNotes > 10) {
            recommendations.push({
                id: 'reduce-orphaned-notes',
                type: 'organization',
                priority: 'high',
                title: 'Connect Orphaned Notes',
                description: `You have ${this.data.content.contentQuality.orphanedNotes} notes with no links. Connecting them will improve knowledge discovery.`,
                action: 'Review and link orphaned notes to related content',
                impact: 'Improved vault connectivity and findability',
                estimatedTime: '30 minutes',
                timestamp
            });
        }
        
        // Performance recommendations
        const avgSearchLatency = this.calculateAverageSearchLatency();
        if (avgSearchLatency > 1000) {
            recommendations.push({
                id: 'optimize-search',
                type: 'performance',
                priority: 'medium',
                title: 'Optimize Search Performance',
                description: `Search queries are taking ${avgSearchLatency}ms on average. Consider rebuilding the search index.`,
                action: 'Rebuild semantic index and clear cache',
                impact: 'Faster search results and better user experience',
                estimatedTime: '5 minutes',
                timestamp
            });
        }
        
        // Workflow recommendations
        const topCommands = this.getTopCommands(3);
        if (topCommands.includes('quick-create-note') && !topCommands.includes('create-note-from-template')) {
            recommendations.push({
                id: 'use-templates',
                type: 'workflow',
                priority: 'low',
                title: 'Consider Using Note Templates',
                description: 'You frequently create notes manually. Templates could speed up your workflow.',
                action: 'Set up note templates for common note types',
                impact: 'Faster note creation with consistent structure',
                estimatedTime: '15 minutes',
                timestamp
            });
        }
        
        // Content recommendations
        if (this.data.content.contentQuality.averageNoteLength < 200) {
            recommendations.push({
                id: 'expand-notes',
                type: 'content',
                priority: 'low',
                title: 'Expand Note Content',
                description: 'Many of your notes are quite short. Adding more detail could improve their value.',
                action: 'Review and expand key notes with additional context',
                impact: 'Richer content and better knowledge capture',
                estimatedTime: '45 minutes',
                timestamp
            });
        }
        
        return recommendations.slice(0, 5); // Return top 5 recommendations
    }

    // Analytics Dashboard Data
    public getAnalyticsDashboard(): AnalyticsData {
        this.generateInsights();
        return { ...this.data };
    }

    public getUsageSummary(): {
        sessionsThisWeek: number;
        notesCreatedThisWeek: number;
        topCommands: string[];
        averageSessionTime: string;
        productivityScore: number;
    } {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const sessionsThisWeek = this.data.usage.weeklyActivity
            .filter(week => new Date(week.week) >= weekAgo)
            .reduce((sum, week) => sum + week.sessions, 0);
        
        const notesCreatedThisWeek = this.data.usage.userProductivity.notesCreated;
        const topCommands = this.getTopCommands(3);
        const averageSessionTime = this.formatDuration(this.data.usage.averageSessionLength);
        const productivityScore = this.calculateProductivityScore();
        
        return {
            sessionsThisWeek,
            notesCreatedThisWeek,
            topCommands,
            averageSessionTime,
            productivityScore
        };
    }

    public exportAnalyticsReport(): string {
        const data = this.getAnalyticsDashboard();
        const timestamp = new Date().toISOString();
        
        let report = `# ElevenLabs AI Plugin Analytics Report\n\n`;
        report += `**Generated:** ${timestamp}\n\n`;
        
        // Executive Summary
        report += `## Executive Summary\n\n`;
        report += `- **Total Conversations:** ${data.usage.totalConversations}\n`;
        report += `- **Average Session Length:** ${this.formatDuration(data.usage.averageSessionLength)}\n`;
        report += `- **Vault Health Score:** ${data.insights.vaultHealth.score}/100\n`;
        report += `- **Active Recommendations:** ${data.recommendations.length}\n\n`;
        
        // Usage Patterns
        report += `## Usage Patterns\n\n`;
        report += `### Most Used Commands\n`;
        data.usage.mostUsedCommands.slice(0, 5).forEach((cmd, idx) => {
            report += `${idx + 1}. ${cmd.command} (${cmd.count} times)\n`;
        });
        
        report += `\n### Peak Usage Hours\n`;
        data.insights.usagePatterns.peakHours.forEach(hour => {
            report += `- ${hour}:00 - ${hour + 1}:00\n`;
        });
        
        // Content Analysis
        report += `\n## Content Analysis\n\n`;
        report += `- **Writing Style:** ${data.insights.contentPatterns.writingStyle}\n`;
        report += `- **Common Topics:** ${data.insights.contentPatterns.commonTopics.join(', ')}\n`;
        report += `- **Expertise Areas:** ${data.insights.contentPatterns.expertiseAreas.join(', ')}\n`;
        
        if (data.insights.contentPatterns.knowledgeGaps.length > 0) {
            report += `- **Knowledge Gaps:** ${data.insights.contentPatterns.knowledgeGaps.join(', ')}\n`;
        }
        
        // Recommendations
        report += `\n## Recommendations\n\n`;
        data.recommendations.forEach((rec, idx) => {
            report += `### ${idx + 1}. ${rec.title} (${rec.priority} priority)\n`;
            report += `${rec.description}\n\n`;
            report += `**Action:** ${rec.action}\n`;
            report += `**Impact:** ${rec.impact}\n`;
            report += `**Estimated Time:** ${rec.estimatedTime}\n\n`;
        });
        
        // Performance Metrics
        report += `## Performance Metrics\n\n`;
        report += `- **Average Search Latency:** ${this.calculateAverageSearchLatency()}ms\n`;
        report += `- **Cache Hit Rate:** ${this.calculateCacheHitRate()}%\n`;
        report += `- **Error Rate:** ${this.calculateErrorRate()}%\n\n`;
        
        return report;
    }

    // Private Helper Methods
    private calculateNewAverage(currentAvg: number, newValue: number, count: number): number {
        return (currentAvg * count + newValue) / (count + 1);
    }

    private trackCommandUsage(command: string): void {
        this.currentCommands.push(command);
        
        const existing = this.data.usage.mostUsedCommands.find(cmd => cmd.command === command);
        if (existing) {
            existing.count++;
        } else {
            this.data.usage.mostUsedCommands.push({ command, count: 1 });
        }
        
        // Sort by usage count
        this.data.usage.mostUsedCommands.sort((a, b) => b.count - a.count);
    }

    private trackSearchPerformance(query: string, latency: number, results: number): void {
        this.data.performance.searchLatency.push({
            query,
            latency,
            timestamp: new Date()
        });
        
        // Keep only recent entries
        if (this.data.performance.searchLatency.length > 100) {
            this.data.performance.searchLatency = this.data.performance.searchLatency.slice(-100);
        }
    }

    private trackNoteCreation(title: string, wordCount: number): void {
        this.data.usage.userProductivity.notesCreated++;
        this.updateContentMetrics();
    }

    private trackNoteEdit(title: string, wordCount: number): void {
        this.data.usage.userProductivity.notesEdited++;
        this.updateContentMetrics();
    }

    private trackError(type: string, message: string): void {
        const existing = this.data.performance.errorRates.find(err => err.type === type);
        if (existing) {
            existing.count++;
            existing.lastOccurrence = new Date();
        } else {
            this.data.performance.errorRates.push({
                type,
                count: 1,
                lastOccurrence: new Date()
            });
        }
    }

    private trackPerformanceMetric(metric: string, value: number): void {
        const timestamp = new Date();
        
        switch (metric) {
            case 'memory_usage':
                this.data.performance.memoryUsage.push({ usage: value, timestamp });
                break;
            case 'cache_hit_rate':
                this.data.performance.cacheEfficiency.push({ hitRate: value, timestamp });
                break;
        }
    }

    private updateTimeDistribution(timestamp: Date): void {
        const hour = timestamp.getHours();
        const existing = this.data.usage.timeDistribution.find(td => td.hour === hour);
        
        if (existing) {
            existing.sessions++;
        } else {
            this.data.usage.timeDistribution.push({ hour, sessions: 1 });
        }
    }

    private updateContentMetrics(): void {
        const files = this.app.vault.getMarkdownFiles();
        const today = new Date().toISOString().split('T')[0];
        
        // Update vault growth
        const existing = this.data.content.vaultGrowth.find(vg => vg.date === today);
        if (existing) {
            existing.noteCount = files.length;
        } else {
            this.data.content.vaultGrowth.push({
                date: today,
                noteCount: files.length,
                wordCount: 0 // Would need to calculate actual word count
            });
        }
    }

    // Calculation Methods
    private calculateOrganizationScore(): number {
        const files = this.app.vault.getMarkdownFiles();
        const foldersUsed = new Set(files.map(f => f.parent?.path || 'root')).size;
        const avgNotesPerFolder = files.length / foldersUsed;
        
        // Score based on reasonable organization (5-15 notes per folder ideal)
        if (avgNotesPerFolder >= 5 && avgNotesPerFolder <= 15) return 90;
        if (avgNotesPerFolder >= 3 && avgNotesPerFolder <= 20) return 75;
        if (avgNotesPerFolder >= 1 && avgNotesPerFolder <= 30) return 60;
        return 40;
    }

    private calculateConnectivityScore(): number {
        const linkDensity = this.data.content.linkDensity;
        const avgConnections = linkDensity.reduce((sum, note) => 
            sum + note.incomingLinks + note.outgoingLinks, 0) / linkDensity.length;
        
        // Score based on connection density
        if (avgConnections >= 5) return 95;
        if (avgConnections >= 3) return 80;
        if (avgConnections >= 1) return 65;
        return 40;
    }

    private calculateContentQualityScore(): number {
        const quality = this.data.content.contentQuality;
        const totalNotes = this.app.vault.getMarkdownFiles().length;
        
        const orphanRatio = quality.orphanedNotes / totalNotes;
        const incompleteRatio = quality.incompleteNotes / totalNotes;
        
        let score = 100;
        score -= orphanRatio * 30; // Penalize orphaned notes
        score -= incompleteRatio * 20; // Penalize incomplete notes
        
        return Math.max(0, Math.round(score));
    }

    private calculateMaintenanceScore(): number {
        const errorRate = this.calculateErrorRate();
        const searchLatency = this.calculateAverageSearchLatency();
        
        let score = 100;
        score -= errorRate * 2; // Penalize errors
        score -= Math.max(0, (searchLatency - 500) / 100); // Penalize slow searches
        
        return Math.max(0, Math.round(score));
    }

    private calculatePeakHours(): number[] {
        const sorted = [...this.data.usage.timeDistribution]
            .sort((a, b) => b.sessions - a.sessions);
        
        return sorted.slice(0, 3).map(td => td.hour);
    }

    private getTopCommands(count: number): string[] {
        return this.data.usage.mostUsedCommands
            .slice(0, count)
            .map(cmd => cmd.command);
    }

    private calculateSessionTrend(): 'increasing' | 'decreasing' | 'stable' {
        const recent = this.data.usage.weeklyActivity.slice(-4);
        if (recent.length < 2) return 'stable';
        
        const trend = recent[recent.length - 1].sessions - recent[0].sessions;
        if (trend > 2) return 'increasing';
        if (trend < -2) return 'decreasing';
        return 'stable';
    }

    private calculateProductivityTrend(): 'improving' | 'declining' | 'stable' {
        // Simple heuristic based on notes created vs sessions
        const ratio = this.data.usage.userProductivity.notesCreated / 
                     Math.max(1, this.data.usage.totalConversations);
        
        if (ratio > 0.8) return 'improving';
        if (ratio < 0.3) return 'declining';
        return 'stable';
    }

    private calculateProductivityScore(): number {
        const productivity = this.data.usage.userProductivity;
        const sessions = this.data.usage.totalConversations;
        
        if (sessions === 0) return 0;
        
        const notesPerSession = productivity.notesCreated / sessions;
        const editsPerSession = productivity.notesEdited / sessions;
        
        return Math.min(100, Math.round((notesPerSession + editsPerSession) * 50));
    }

    private calculateAverageSearchLatency(): number {
        const latencies = this.data.performance.searchLatency;
        if (latencies.length === 0) return 0;
        
        return latencies.reduce((sum, entry) => sum + entry.latency, 0) / latencies.length;
    }

    private calculateCacheHitRate(): number {
        const efficiency = this.data.performance.cacheEfficiency;
        if (efficiency.length === 0) return 0;
        
        return efficiency[efficiency.length - 1]?.hitRate || 0;
    }

    private calculateErrorRate(): number {
        const errors = this.data.performance.errorRates;
        const totalErrors = errors.reduce((sum, err) => sum + err.count, 0);
        const totalSessions = this.data.usage.totalConversations;
        
        return totalSessions > 0 ? (totalErrors / totalSessions) * 100 : 0;
    }

    private calculateTrends(): TrendData[] {
        // Implementation for trend calculation would go here
        return [];
    }

    private extractCommonTopics(files: TFile[]): string[] {
        // Simple topic extraction from file names
        const words = files.flatMap(f => 
            f.name.replace('.md', '').toLowerCase().split(/[\s-_]+/)
        );
        
        const frequency = words.reduce((acc, word) => {
            if (word.length > 3) {
                acc[word] = (acc[word] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    private identifyKnowledgeGaps(files: TFile[]): string[] {
        // Placeholder implementation
        return ['automation', 'workflows', 'productivity'];
    }

    private identifyExpertiseAreas(files: TFile[]): string[] {
        // Placeholder implementation
        return ['research', 'notes', 'documentation'];
    }

    private formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    // Data Persistence
    private initializeAnalyticsData(): AnalyticsData {
        return {
            usage: {
                totalConversations: 0,
                averageSessionLength: 0,
                mostUsedCommands: [],
                timeDistribution: [],
                weeklyActivity: [],
                userProductivity: {
                    notesCreated: 0,
                    notesEdited: 0,
                    searchQueries: 0,
                    averageResponseTime: 0
                }
            },
            content: {
                vaultGrowth: [],
                contentTypes: [],
                tagEvolution: [],
                linkDensity: [],
                contentQuality: {
                    averageNoteLength: 0,
                    orphanedNotes: 0,
                    duplicateContent: 0,
                    incompleteNotes: 0
                }
            },
            performance: {
                searchLatency: [],
                embeddingBuildTime: [],
                cacheEfficiency: [],
                memoryUsage: [],
                errorRates: []
            },
            insights: {
                vaultHealth: { score: 0, factors: [] },
                contentPatterns: {
                    writingStyle: 'unknown',
                    commonTopics: [],
                    knowledgeGaps: [],
                    expertiseAreas: []
                },
                usagePatterns: {
                    peakHours: [],
                    preferredCommands: [],
                    sessionLengthTrend: 'stable',
                    productivityTrend: 'stable'
                }
            },
            recommendations: [],
            trends: []
        };
    }

    private loadStoredData(): void {
        try {
            const stored = localStorage.getItem('elevenlabs-analytics');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.data = { ...this.data, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
    }

    private saveData(): void {
        try {
            localStorage.setItem('elevenlabs-analytics', JSON.stringify(this.data));
        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }

    public clearAnalyticsData(): void {
        this.data = this.initializeAnalyticsData();
        localStorage.removeItem('elevenlabs-analytics');
        console.log('Analytics data cleared');
    }
}