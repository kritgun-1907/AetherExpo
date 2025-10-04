// src/services/StorageService.js - FIXED VERSION
import { supabase } from '../api/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

class StorageService {
  constructor() {
    this.buckets = {
      AVATARS: 'avatars',
      RECEIPTS: 'receipts',
      CHALLENGE_IMAGES: 'challenge-images',
      CERTIFICATES: 'certificates',
      APP_ASSETS: 'app-assets'
    };
  }

  /**
   * Get proper MIME type for file extension
   */
  getMimeType(fileExt) {
    const ext = fileExt.toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'heic': 'image/heic',
      'heif': 'image/heif'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get file extension from URI
   */
  getFileExtension(uri) {
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    // Normalize jpg to jpeg for consistency
    return extension === 'jpg' ? 'jpeg' : extension;
  }

  /**
   * Get the public URL for a file in a public bucket
   */
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  }

  /**
   * Get a signed URL for a file in a private bucket
   */
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      
      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  }

  /**
   * Upload user avatar - FIXED VERSION
   */
  async uploadAvatar(userId, imageUri) {
    try {
      console.log('📤 Uploading avatar for user:', userId);
      console.log('📁 Image URI:', imageUri);

      // Read the image file
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get file extension and normalize it
      const fileExt = this.getFileExtension(imageUri);
      const mimeType = this.getMimeType(fileExt);
      
      console.log('📋 File extension:', fileExt);
      console.log('📋 MIME type:', mimeType);

      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
      
      console.log('📝 Uploading to:', fileName);

      // Upload to Supabase Storage with correct MIME type
      const { data, error } = await supabase.storage
        .from(this.buckets.AVATARS)
        .upload(fileName, decode(base64), {
          contentType: mimeType, // ✅ Now using proper MIME type
          upsert: true
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }

      console.log('✅ Upload successful:', data);

      // Update user profile with avatar URL
      const avatarUrl = this.getPublicUrl(this.buckets.AVATARS, data.path);
      
      console.log('🔗 Avatar URL:', avatarUrl);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          avatar_url: avatarUrl,
          storage_avatar_path: data.path,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Profile update error:', updateError);
        throw updateError;
      }

      console.log('✅ Avatar upload complete!');

      return {
        success: true,
        url: avatarUrl,
        path: data.path
      };
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload avatar'
      };
    }
  }

  /**
   * Pick and upload avatar image
   */
  async pickAndUploadAvatar(userId) {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access media library was denied'
        };
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        // Force JPEG format
        allowsMultipleSelection: false,
      });

      if (!result.canceled) {
        return await this.uploadAvatar(userId, result.assets[0].uri);
      }

      return {
        success: false,
        error: 'Image selection cancelled'
      };
    } catch (error) {
      console.error('Error picking and uploading avatar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload receipt for carbon tracking - FIXED
   */
  async uploadReceipt(userId, receiptUri, metadata = {}) {
    try {
      const base64 = await FileSystem.readAsStringAsync(receiptUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = this.getFileExtension(receiptUri);
      const mimeType = this.getMimeType(fileExt);
      const fileName = `${userId}/receipt-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(this.buckets.RECEIPTS)
        .upload(fileName, decode(base64), {
          contentType: mimeType, // ✅ Fixed MIME type
          metadata: metadata
        });

      if (error) throw error;

      // Store receipt record in database
      const { data: receiptRecord, error: dbError } = await supabase
        .from('user_receipts')
        .insert({
          user_id: userId,
          storage_path: data.path,
          file_name: fileName,
          file_size: base64.length,
          mime_type: mimeType,
          metadata: metadata,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        success: true,
        path: data.path,
        id: receiptRecord.id
      };
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload challenge image - FIXED
   */
  async uploadChallengeImage(challengeId, imageUri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = this.getFileExtension(imageUri);
      const mimeType = this.getMimeType(fileExt);
      const fileName = `${challengeId}/image-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(this.buckets.CHALLENGE_IMAGES)
        .upload(fileName, decode(base64), {
          contentType: mimeType // ✅ Fixed MIME type
        });

      if (error) throw error;

      const imageUrl = this.getPublicUrl(this.buckets.CHALLENGE_IMAGES, data.path);
      
      // Update challenge with image URL
      const { error: updateError } = await supabase
        .from('challenges')
        .update({ 
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId);

      if (updateError) throw updateError;

      return {
        success: true,
        url: imageUrl,
        path: data.path
      };
    } catch (error) {
      console.error('Error uploading challenge image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket, path) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(bucket, folder, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit: limit,
          offset: offset,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      return {
        success: true,
        files: data || []
      };
    } catch (error) {
      console.error('Error listing files:', error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  /**
   * Download file from storage
   */
  async downloadFile(bucket, path) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get storage usage for a user
   */
  async getUserStorageUsage(userId) {
    try {
      const buckets = [
        this.buckets.AVATARS,
        this.buckets.RECEIPTS,
        this.buckets.CERTIFICATES
      ];

      let totalSize = 0;
      const usage = {};

      for (const bucket of buckets) {
        const { data } = await supabase.storage
          .from(bucket)
          .list(userId);

        if (data) {
          const bucketSize = data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
          usage[bucket] = {
            files: data.length,
            size: bucketSize
          };
          totalSize += bucketSize;
        }
      }

      return {
        success: true,
        totalSize: totalSize,
        usage: usage
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new StorageService();