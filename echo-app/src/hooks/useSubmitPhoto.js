/**
 * useSubmitPhoto - Hook to submit a photo for a request
 * 
 * Uploads the photo to Supabase Storage and calls the submit_photo
 * RPC function to validate and record the submission.
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Import legacy FileSystem API for SDK 54 compatibility
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET_NAME = 'echo-photos';

export const useSubmitPhoto = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    /**
     * Submit a photo for a request
     * @param {Object} params
     * @param {string} params.requestId - UUID of the request
     * @param {string} params.photoUri - Local URI of the photo
     * @param {number} params.latitude - Latitude where photo was taken
     * @param {number} params.longitude - Longitude where photo was taken
     */
    const submitPhoto = useCallback(async ({
        requestId,
        photoUri,
        latitude,
        longitude,
    }) => {
        if (!user?.id) {
            return { error: new Error('Not authenticated') };
        }

        if (!requestId || !photoUri) {
            return { error: new Error('Request ID and photo are required') };
        }

        if (!latitude || !longitude) {
            return { error: new Error('Location is required for photo submission') };
        }

        try {
            setLoading(true);
            setError(null);
            setProgress(0);

            // Generate a unique filename
            const timestamp = Date.now();
            const filename = `${requestId}/${user.id}_${timestamp}.jpg`;

            // Read the photo and convert to uploadable format
            setProgress(10);
            let byteArray;

            if (Platform.OS === 'web') {
                // Web: photoUri is a blob URL or data URL
                setProgress(20);
                const response = await fetch(photoUri);
                const blob = await response.blob();
                setProgress(30);
                const arrayBuffer = await blob.arrayBuffer();
                byteArray = new Uint8Array(arrayBuffer);
            } else {
                // Native: use FileSystem to read as base64
                // Use 'base64' string directly instead of EncodingType enum
                const base64 = await FileSystem.readAsStringAsync(photoUri, {
                    encoding: 'base64',
                });

                // Convert base64 to byte array
                setProgress(30);
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                byteArray = new Uint8Array(byteNumbers);
            }

            // Upload to Supabase Storage
            setProgress(50);
            console.log('📸 Uploading photo to storage...', { filename, size: byteArray.length });

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filename, byteArray, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (uploadError) {
                console.error('❌ Error uploading photo to storage:', uploadError);
                setError(uploadError);
                return { error: uploadError };
            }

            // Get the storage path
            const storagePath = uploadData.path;
            setProgress(70);
            console.log('✅ Photo uploaded to storage:', storagePath);

            // Call the submit_photo RPC function
            console.log('📤 Calling submit_photo RPC...', { requestId, storagePath, latitude, longitude });

            const { data, error: rpcError } = await supabase.rpc('submit_photo', {
                p_request_id: requestId,
                p_storage_path: storagePath,
                p_latitude: latitude,
                p_longitude: longitude,
            });

            console.log('📥 RPC Response:', { data, error: rpcError });

            if (rpcError) {
                console.error('❌ Error submitting photo RPC:', rpcError);
                setError(rpcError);
                // Try to clean up the uploaded file
                await supabase.storage.from(BUCKET_NAME).remove([filename]);
                return { error: rpcError };
            }

            setProgress(100);
            console.log('✅ Photo submitted successfully:', data);

            return { 
                success: true, 
                photoId: data,
                storagePath,
            };
        } catch (err) {
            console.error('Unexpected error submitting photo:', err);
            setError(err);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    return {
        submitPhoto,
        loading,
        error,
        progress,
    };
};

export default useSubmitPhoto;

