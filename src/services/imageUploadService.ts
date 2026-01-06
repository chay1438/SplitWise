import { supabase } from '../lib/supabase';

export const uploadImageToSupabase = async (uri: string, bucketName: string = 'receipts'): Promise<string | null> => {
    try {
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Modern Approach: Fetch the local URI to get a Blob (Binary Large Object)
        // This is more efficient than Base64 string reading
        const response = await fetch(uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, blob, {
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
