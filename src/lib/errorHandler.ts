import { Alert } from 'react-native';

export const handleError = (error: any, defaultMessage: string = "An error occurred") => {
    console.error(defaultMessage, error);

    let message = defaultMessage;

    if (typeof error === 'string') {
        message = error;
    } else if (error?.data?.message) {
        message = error.data.message;
    } else if (error?.data?.error) {
        message = error.data.error;
    } else if (error?.message) {
        message = error.message;
    } else if (error?.error) { // Supabase sometimes returns { error: "msg" }
        message = error.error;
    }

    Alert.alert("Error", message);
};
