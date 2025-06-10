import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CloudUpload, FolderOpen, Link, Plus } from "lucide-react";
import { fileUploader, type UploadProgress } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
}

export function UploadModal({ isOpen, onClose, projectId }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [processingOptions, setProcessingOptions] = useState({
    generateUseCases: true,
    extractBusinessRules: true,
    identifyMissingInfo: false,
    suggestArchitecture: false,
  });
  const { toast } = useToast();

  useState(() => {
    const unsubscribe = fileUploader.onProgress(setUploadProgress);
    return unsubscribe;
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddUrl = async () => {
    if (!url.trim()) return;
    
    try {
      await fileUploader.uploadFromUrl(url, projectId);
      setUrl("");
      toast({
        title: "URL added",
        description: "Document will be processed from the provided URL.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process URL. Please check the URL and try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      await fileUploader.uploadFiles(files, projectId);
      setFiles([]);
      // Keep modal open to show progress
      toast({
        title: "Upload started",
        description: "Your files are being processed. You can monitor progress here.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading files.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setFiles([]);
    setUrl("");
    setUploadProgress([]);
    fileUploader.clearProgress();
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type.includes('sheet')) return '📊';
    if (file.type.includes('presentation')) return '📈';
    if (file.type.includes('image')) return '🖼️';
    return '📁';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload & Analyze Documents</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Enhanced Upload Zone */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragOver
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-green-500 hover:bg-green-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CloudUpload className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Drag & drop your files here
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Supported formats: PDF, DOCX, XLSX, PPTX, JPG, PNG, TIFF, ZIP
                </p>
                <p className="text-gray-500 text-xs">
                  Maximum file size: 50MB per file
                </p>
              </div>
              <label>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.tiff,.zip"
                />
                <Button className="bg-green-600 hover:bg-green-700" asChild>
                  <span>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Choose Files
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Selected Files</h5>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getFileIcon(file)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Processing Status</h5>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadProgress.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getFileIcon(item.file)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(item.file.size)} • {item.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.status === 'completed' ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : item.status === 'error' ? (
                        <span className="text-red-600 text-sm">✗</span>
                      ) : (
                        <>
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-green-600">{item.progress}%</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* URL Input Section */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3">Or add content from URL</h5>
            <div className="flex space-x-3">
              <Input
                type="url"
                placeholder="https://example.com/document.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddUrl} disabled={!url.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              We'll fetch and process the document from the URL
            </p>
          </div>

          {/* AI Processing Options */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
              🤖 AI Processing Options
            </h5>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generateUseCases"
                  checked={processingOptions.generateUseCases}
                  onCheckedChange={(checked) =>
                    setProcessingOptions(prev => ({
                      ...prev,
                      generateUseCases: checked as boolean
                    }))
                  }
                />
                <Label htmlFor="generateUseCases" className="text-sm text-gray-700">
                  Auto-generate use cases
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="extractBusinessRules"
                  checked={processingOptions.extractBusinessRules}
                  onCheckedChange={(checked) =>
                    setProcessingOptions(prev => ({
                      ...prev,
                      extractBusinessRules: checked as boolean
                    }))
                  }
                />
                <Label htmlFor="extractBusinessRules" className="text-sm text-gray-700">
                  Extract business rules
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="identifyMissingInfo"
                  checked={processingOptions.identifyMissingInfo}
                  onCheckedChange={(checked) =>
                    setProcessingOptions(prev => ({
                      ...prev,
                      identifyMissingInfo: checked as boolean
                    }))
                  }
                />
                <Label htmlFor="identifyMissingInfo" className="text-sm text-gray-700">
                  Identify missing information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suggestArchitecture"
                  checked={processingOptions.suggestArchitecture}
                  onCheckedChange={(checked) =>
                    setProcessingOptions(prev => ({
                      ...prev,
                      suggestArchitecture: checked as boolean
                    }))
                  }
                />
                <Label htmlFor="suggestArchitecture" className="text-sm text-gray-700">
                  Suggest architecture patterns
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartProcessing}
              disabled={files.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Start Processing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
