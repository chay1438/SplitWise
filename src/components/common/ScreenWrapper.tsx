import React from 'react';
import { StyleSheet, View, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Colors, AppConfig } from '../../constants/index';
import LinearGradient from 'react-native-linear-gradient';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle;
    edges?: Edge[];
    backgroundColor?: string;
    gradient?: string[]; // Array of colors for gradient
    gradientStart?: { x: number; y: number };
    gradientEnd?: { x: number; y: number };
    statusBarColor?: string;
    statusBarStyle?: 'light-content' | 'dark-content' | 'default';
}

/**
 * A standard wrapper for all screens to handle Safe Area Insets and Global Backgrounds.
 * Industry-Standard approach for consistency.
 */
export const ScreenWrapper = ({
    children,
    style,
    edges = ['top'],
    backgroundColor = AppConfig.defaultBackground,
    gradient,
    gradientStart = { x: 0, y: 0 },
    gradientEnd = { x: 0, y: 1 },
    statusBarColor,
    statusBarStyle = AppConfig.statusBarStyle,
}: ScreenWrapperProps) => {
    const content = (
        <SafeAreaView style={[styles.inner, style]} edges={edges}>
            {children}
        </SafeAreaView>
    );

    return (
        <View style={[styles.container, { backgroundColor: gradient ? 'transparent' : backgroundColor }]}>
            <StatusBar
                backgroundColor={statusBarColor || (gradient ? gradient[0] : backgroundColor)}
                barStyle={statusBarStyle}
                translucent={AppConfig.statusBarTranslucent}
            />
            {gradient ? (
                <LinearGradient
                    colors={gradient}
                    start={gradientStart}
                    end={gradientEnd}
                    style={styles.container}
                >
                    {content}
                </LinearGradient>
            ) : (
                content
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
    },
});
