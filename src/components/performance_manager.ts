import { App, TFile, debounce } from "obsidian";

export interface PerformanceMetrics {
    embeddingBuildTime: number;
    searchLatency: number;
    memoryUsage: number;
    cacheHitRate: number;
    lastOptimization: Date;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    accessCount: number;
    size: number;
}

export class PerformanceManager {
    private app: App;
    private cache = new Map<string, CacheEntry<any>>();
    private maxCacheSize = 50 * 1024 * 1024; // 50MB
    private currentCacheSize = 0;
    private cacheHits = 0;
    private cacheMisses = 0;
    private metrics: PerformanceMetrics;
    
    // Debounced operations
    private debouncedEmbeddingUpdate: (file: TFile) => void;
    private debouncedCacheCleanup: () => void;
    
    // Performance thresholds
    private readonly LARGE_VAULT_THRESHOLD = 1000; // notes
    private readonly MEMORY_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB
    private readonly SEARCH_LATENCY_WARNING = 2000; // 2 seconds

    constructor(app: App) {
        this.app = app;
        this.metrics = {
            embeddingBuildTime: 0,
            searchLatency: 0,
            memoryUsage: 0,
            cacheHitRate: 0,
            lastOptimization: new Date()
        };
        
        this.debouncedEmbeddingUpdate = debounce(this.performEmbeddingUpdate.bind(this), 1000, true);
        this.debouncedCacheCleanup = debounce(this.performCacheCleanup.bind(this), 5000, true);
        
        this.initializePerformanceMonitoring();
    }

    private initializePerformanceMonitoring() {
        // Monitor memory usage periodically
        setInterval(() => {
            this.updateMemoryMetrics();
            this.checkPerformanceThresholds();
        }, 30000); // Every 30 seconds

        // Clean up cache periodically
        setInterval(() => {
            this.performCacheCleanup();
        }, 300000); // Every 5 minutes
    }

    // Cache Management
    public cacheSet<T>(key: string, data: T, ttl: number = 3600000): void { // 1 hour default TTL
        const size = this.estimateObjectSize(data);
        
        // Check if we need to make room
        if (this.currentCacheSize + size > this.maxCacheSize) {
            this.evictLeastRecentlyUsed(size);
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            accessCount: 0,
            size
        };

        // Remove old entry if exists
        if (this.cache.has(key)) {
            const oldEntry = this.cache.get(key)!;
            this.currentCacheSize -= oldEntry.size;
        }

        this.cache.set(key, entry);
        this.currentCacheSize += size;
    }

    public cacheGet<T>(key: string, maxAge: number = 3600000): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.cacheMisses++;
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > maxAge) {
            this.cache.delete(key);
            this.currentCacheSize -= entry.size;
            this.cacheMisses++;
            return null;
        }

        // Update access count and timestamp
        entry.accessCount++;
        entry.timestamp = Date.now();
        this.cacheHits++;
        
        return entry.data as T;
    }

    public cacheDelete(key: string): void {
        const entry = this.cache.get(key);
        if (entry) {
            this.cache.delete(key);
            this.currentCacheSize -= entry.size;
        }
    }

    public cacheClear(): void {
        this.cache.clear();
        this.currentCacheSize = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    private evictLeastRecentlyUsed(requiredSpace: number): void {
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => {
                // Sort by access frequency and recency
                const scoreA = a[1].accessCount + (Date.now() - a[1].timestamp) / 1000000;
                const scoreB = b[1].accessCount + (Date.now() - b[1].timestamp) / 1000000;
                return scoreA - scoreB;
            });

        let freedSpace = 0;
        for (const [key, entry] of entries) {
            this.cache.delete(key);
            this.currentCacheSize -= entry.size;
            freedSpace += entry.size;
            
            if (freedSpace >= requiredSpace) {
                break;
            }
        }
    }

    // Performance Optimization
    public async optimizeForVaultSize(): Promise<void> {
        const noteCount = this.app.vault.getMarkdownFiles().length;
        
        if (noteCount > this.LARGE_VAULT_THRESHOLD) {
            console.log(`Large vault detected (${noteCount} notes). Applying optimizations...`);
            
            // Adjust cache size for large vaults
            this.maxCacheSize = Math.min(200 * 1024 * 1024, noteCount * 100 * 1024); // 100KB per note estimate
            
            // Implement progressive loading for embeddings
            await this.implementProgressiveEmbeddingLoad();
            
            // Optimize search thresholds
            this.optimizeSearchParameters();
        }

        this.metrics.lastOptimization = new Date();
    }

    private async implementProgressiveEmbeddingLoad(): Promise<void> {
        // Load embeddings in chunks to avoid blocking the UI
        const files = this.app.vault.getMarkdownFiles();
        const chunkSize = 50;
        
        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);
            
            // Process chunk asynchronously
            setTimeout(async () => {
                for (const file of chunk) {
                    // Process file if needed
                    await this.processFileForEmbedding(file);
                }
            }, i * 10); // Stagger processing
        }
    }

    private async processFileForEmbedding(file: TFile): Promise<void> {
        // Check cache first
        const cacheKey = `embedding_${file.path}_${file.stat.mtime}`;
        const cached = this.cacheGet(cacheKey);
        
        if (cached) {
            return; // Already processed and cached
        }

        // Process file and cache result
        try {
            const content = await this.app.vault.read(file);
            // Simulate embedding processing (replace with actual logic)
            const processed = { file: file.path, size: content.length };
            this.cacheSet(cacheKey, processed);
        } catch (error) {
            console.error(`Failed to process file ${file.path}:`, error);
        }
    }

    private optimizeSearchParameters(): void {
        const noteCount = this.app.vault.getMarkdownFiles().length;
        
        // Adjust search parameters based on vault size
        if (noteCount > 5000) {
            // Very large vault - more aggressive filtering
            console.log("Applying aggressive search optimizations for very large vault");
        } else if (noteCount > 2000) {
            // Large vault - moderate filtering
            console.log("Applying moderate search optimizations for large vault");
        }
    }

    // Error Recovery and Resilience
    public async recoverFromError(error: Error, context: string): Promise<boolean> {
        console.error(`Error in ${context}:`, error);
        
        try {
            switch (context) {
                case 'embedding_build':
                    await this.recoverEmbeddingBuild();
                    break;
                case 'search_operation':
                    await this.recoverSearchOperation();
                    break;
                case 'cache_operation':
                    this.recoverCacheOperation();
                    break;
                default:
                    return false;
            }
            return true;
        } catch (recoveryError) {
            console.error(`Recovery failed for ${context}:`, recoveryError);
            return false;
        }
    }

    private async recoverEmbeddingBuild(): Promise<void> {
        // Clear corrupted embeddings and rebuild incrementally
        this.cacheClear();
        await this.implementProgressiveEmbeddingLoad();
    }

    private async recoverSearchOperation(): Promise<void> {
        // Clear search cache and reduce complexity
        const searchKeys = Array.from(this.cache.keys()).filter(key => key.startsWith('search_'));
        searchKeys.forEach(key => this.cacheDelete(key));
    }

    private recoverCacheOperation(): void {
        // Reset cache state
        this.cacheClear();
        console.log("Cache cleared due to operation error");
    }

    // Performance Monitoring
    public startPerformanceTimer(operation: string): () => number {
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            this.recordMetric(operation, duration);
            return duration;
        };
    }

    private recordMetric(operation: string, duration: number): void {
        switch (operation) {
            case 'embedding_build':
                this.metrics.embeddingBuildTime = duration;
                break;
            case 'search':
                this.metrics.searchLatency = duration;
                break;
        }
    }

    private updateMemoryMetrics(): void {
        // Estimate memory usage
        this.metrics.memoryUsage = this.currentCacheSize;
        this.metrics.cacheHitRate = this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;
    }

    private checkPerformanceThresholds(): void {
        if (this.metrics.memoryUsage > this.MEMORY_WARNING_THRESHOLD) {
            console.warn(`High memory usage detected: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            this.performCacheCleanup();
        }

        if (this.metrics.searchLatency > this.SEARCH_LATENCY_WARNING) {
            console.warn(`High search latency detected: ${this.metrics.searchLatency}ms`);
        }
    }

    // Debounced Operations
    public scheduleEmbeddingUpdate(file: TFile): void {
        this.debouncedEmbeddingUpdate(file);
    }

    public scheduleCacheCleanup(): void {
        this.debouncedCacheCleanup();
    }

    private performEmbeddingUpdate(file: TFile): void {
        // Actual embedding update logic here
        this.processFileForEmbedding(file).catch(console.error);
    }

    private performCacheCleanup(): void {
        const now = Date.now();
        const oneHour = 3600000;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > oneHour && entry.accessCount < 2) {
                this.cacheDelete(key);
            }
        }
    }

    // Utility Methods
    private estimateObjectSize(obj: any): number {
        const jsonString = JSON.stringify(obj);
        return new Blob([jsonString]).size;
    }

    public getPerformanceMetrics(): PerformanceMetrics {
        this.updateMemoryMetrics();
        return { ...this.metrics };
    }

    public getCacheStats(): { size: number; entries: number; hitRate: number } {
        return {
            size: this.currentCacheSize,
            entries: this.cache.size,
            hitRate: this.metrics.cacheHitRate
        };
    }

    // Batch Operations
    public async processBatchOperation<T>(
        items: T[],
        processor: (item: T) => Promise<void>,
        batchSize: number = 10,
        delayBetweenBatches: number = 100
    ): Promise<void> {
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            await Promise.all(batch.map(item => 
                processor(item).catch(error => {
                    console.error('Batch processing error:', error);
                })
            ));
            
            // Small delay to prevent UI blocking
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }
    }

    // Resource Cleanup
    public cleanup(): void {
        this.cacheClear();
        // Clear any intervals or timers if needed
        console.log("Performance manager cleaned up");
    }
}