import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, FolderOpen, Link, FileText, CheckCircle } from "lucide-react";
import { fileUploader, type UploadProgress } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

export function DocumentUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    try {
      await fileUploader.uploadFiles(files, 1); // Default project ID
      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded and processing started.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('presentation')) return '📈';
    if (mimeType.includes('image')) return '🖼️';
    return '📁';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Document Analysis & Processing
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            🤖 AI-Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Drag & Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-green-500 hover:bg-green-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CloudUpload className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Drop your documents here
              </h4>
              <p className="text-gray-600 text-sm">
                Support for PDF, Word, Excel, PowerPoint, Images, and ZIP files
              </p>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <Button className="bg-green-600 hover:bg-green-700">
                <FolderOpen className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
              <span className="text-gray-400">or</span>
              <Button variant="outline">
                <Link className="mr-2 h-4 w-4" />
                Add URL
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.tiff,.zip"
        />

        {/* File Processing Queue */}
        {uploadProgress.length > 0 && (
          <div className="mt-6 space-y-3">
            {uploadProgress.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  item.status === 'completed' 
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {getFileIcon(item.file.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.file.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(item.file.size / 1024 / 1024).toFixed(1)} MB • {item.status === 'completed' ? 'Completed' : item.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {item.status === 'completed' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">
                        Use Cases Generated
                      </span>
                    </>
                  ) : item.status === 'error' ? (
                    <span className="text-sm text-red-600 font-medium">
                      Error
                    </span>
                  ) : (
                    <>
                      <div className="w-6 h-6">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                      <span className="text-sm text-green-600 font-medium">
                        {item.progress}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
