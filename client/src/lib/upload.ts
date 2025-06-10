export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  documentId?: number;
  error?: string;
}

export class FileUploader {
  private progressCallbacks: ((progress: UploadProgress[]) => void)[] = [];
  private uploads: Map<string, UploadProgress> = new Map();

  onProgress(callback: (progress: UploadProgress[]) => void) {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  private updateProgress(fileId: string, update: Partial<UploadProgress>) {
    const current = this.uploads.get(fileId);
    if (current) {
      const updated = { ...current, ...update };
      this.uploads.set(fileId, updated);
      this.notifyProgress();
    }
  }

  private notifyProgress() {
    const allProgress = Array.from(this.uploads.values());
    this.progressCallbacks.forEach(callback => callback(allProgress));
  }

  async uploadFiles(files: File[], projectId?: number): Promise<void> {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      throw new Error("No authentication session");
    }

    // Initialize progress tracking
    files.forEach(file => {
      const fileId = `${file.name}-${file.size}-${Date.now()}`;
      this.uploads.set(fileId, {
        file,
        progress: 0,
        status: 'pending'
      });
    });

    this.notifyProgress();

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    if (projectId) {
      formData.append('projectId', projectId.toString());
    }

    try {
      // Update all files to uploading status
      files.forEach(file => {
        const fileId = Array.from(this.uploads.keys()).find(id => 
          this.uploads.get(id)?.file === file
        );
        if (fileId) {
          this.updateProgress(fileId, { status: 'uploading', progress: 10 });
        }
      });

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const documents = await response.json();

      // Update progress to processing
      files.forEach((file, index) => {
        const fileId = Array.from(this.uploads.keys()).find(id => 
          this.uploads.get(id)?.file === file
        );
        if (fileId && documents[index]) {
          this.updateProgress(fileId, {
            status: 'processing',
            progress: 50,
            documentId: documents[index].id
          });
        }
      });

      // Simulate processing completion (in real app, this would be handled by webhooks/polling)
      setTimeout(() => {
        files.forEach(file => {
          const fileId = Array.from(this.uploads.keys()).find(id => 
            this.uploads.get(id)?.file === file
          );
          if (fileId) {
            this.updateProgress(fileId, { status: 'completed', progress: 100 });
          }
        });
      }, 3000);

    } catch (error) {
      // Update all files to error status
      files.forEach(file => {
        const fileId = Array.from(this.uploads.keys()).find(id => 
          this.uploads.get(id)?.file === file
        );
        if (fileId) {
          this.updateProgress(fileId, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      });
      throw error;
    }
  }

  async uploadFromUrl(url: string, projectId?: number): Promise<void> {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      throw new Error("No authentication session");
    }

    try {
      const response = await fetch('/api/documents/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ url, projectId }),
      });

      if (!response.ok) {
        throw new Error(`URL upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  clearProgress() {
    this.uploads.clear();
    this.notifyProgress();
  }
}

export const fileUploader = new FileUploader();
