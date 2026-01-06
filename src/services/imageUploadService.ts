import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export const uploadImageToSupabase = async (uri: string, bucketName: string = 'receipts'): Promise<string | null> => {
    try {
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Robust React Native Approach: Read as Base64 -> Convert to ArrayBuffer
        // This solves "Network request failed" which happens with fetch/blob on some RN versions
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, decode(base64), {
                contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                upsert: false
            });

        if (error) {
            console.error('Supabase Storage Upload Error:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
    }
};

export const deleteImageFromSupabase = async (pathOrUrl: string, bucketName: string = 'receipts'): Promise<void> => {
    try {
        // Extract file path from URL
        // Example: .../bucketName/filename.jpg -> filename.jpg
        let path = pathOrUrl;
        if (pathOrUrl.startsWith('http')) {
            const parts = pathOrUrl.split(`/${bucketName}/`);
            if (parts.length > 1) {
                path = parts[1];
            }
        }

        const { error } = await supabase.storage
            .from(bucketName)
            .remove([path]);

        if (error) {
            console.error('Supabase Storage Delete Error:', error);
            // We log it but usually don't throw to prevent blocking the main save flow
        }
    } catch (error) {
        console.error('Image delete failed:', error);
    }
};
