'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, User } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate?: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarUpdate, 
  size = 'md',
  className = '' 
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File too large. Please upload an image smaller than 5MB.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast.success('Avatar updated successfully!');
      
      if (onAvatarUpdate) {
        onAvatarUpdate(result.avatarUrl);
      }

      // Force a page refresh to update the avatar in the navigation
      window.location.reload();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  }, [onAvatarUpdate]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Avatar Display */}
      <div 
        className={`
          relative ${sizeClasses[size]} rounded-full overflow-hidden
          ${dragActive ? 'ring-2 ring-primary ring-offset-2' : ''}
          ${isUploading ? 'opacity-50' : ''}
          cursor-pointer transition-all duration-200
          hover:scale-105
        `}
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Avatar className={`w-full h-full ${sizeClasses[size]}`}>
          <AvatarImage 
            src={currentAvatarUrl || undefined} 
            alt="Profile picture" 
          />
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="w-1/2 h-1/2" />
          </AvatarFallback>
        </Avatar>

        {/* Upload Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="text-white text-center">
            <Camera className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">Click to upload</span>
          </div>
        </div>

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
              <span className="text-xs">Uploading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Photo
        </Button>
        
        {currentAvatarUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const response = await fetch('/api/avatar/remove', {
                  method: 'POST',
                });

                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.error || 'Remove failed');
                }

                toast.success('Avatar removed successfully!');
                
                if (onAvatarUpdate) {
                  onAvatarUpdate('');
                }

                // Force a page refresh to update the avatar in the navigation
                window.location.reload();

              } catch (error) {
                console.error('Remove error:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to remove avatar');
              }
            }}
            disabled={isUploading}
            className="px-3"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag and Drop Instructions */}
      {dragActive && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-full flex items-center justify-center">
          <div className="text-primary text-center">
            <Upload className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">Drop image here</span>
          </div>
        </div>
      )}
    </div>
  );
}
