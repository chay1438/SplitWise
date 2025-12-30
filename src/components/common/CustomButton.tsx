import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Colors, Spacing } from '../../theme';

interface CustomButtonProps {
    onPress: () => void;
    title: string;
    type?: 'primary' | 'secondary' | 'outline' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export const CustomButton = ({
    onPress,
    title,
    type = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
}: CustomButtonProps) => {
    const getButtonStyle = () => {
        switch (type) {
            case 'secondary':
                return styles.secondary;
            case 'outline':
                return styles.outline;
            case 'ghost':
                return styles.ghost;
            default:
                return styles.primary;
        }
    };

    const getTextStyle = () => {
        switch (type) {
            case 'outline':
                return styles.outlineText;
            case 'ghost':
                return styles.ghostText;
            default:
                return styles.primaryText;
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[styles.base, getButtonStyle(), style, (disabled || loading) && styles.disabled]}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={type === 'outline' || type === 'ghost' ? Colors.primary : Colors.white} />
            ) : (
                <>
                    {icon}
                    <Text style={[styles.baseText, getTextStyle(), textStyle]}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    baseText: {
        fontSize: 16,
        fontWeight: '700',
    },
    primary: {
        backgroundColor: Colors.primary,
    },
    primaryText: {
        color: Colors.white,
    },
    secondary: {
        backgroundColor: Colors.secondary,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    outlineText: {
        color: Colors.primary,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: Colors.textSecondary,
    },
    disabled: {
        opacity: 0.5,
    },
});
