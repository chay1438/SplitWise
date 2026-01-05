import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, Alert, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Colors } from '../../constants';

type Props = NativeStackScreenProps<AppStackParamList, 'ReceiptViewer'>;

const { width, height } = Dimensions.get('window');

export default function ReceiptViewerScreen({ route, navigation }: Props) {
    const { imageUrl, expenseId, description, date, amount } = route.params;
    const [headerVisible, setHeaderVisible] = useState(true);

    const toggleHeader = () => setHeaderVisible(!headerVisible);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Receipt for ${description}: ${imageUrl}`,
                url: imageUrl,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Receipt",
            "Are you sure you want to remove this receipt? This visual action cannot be undone immediately (mock).",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        // Logic to delete receipt from expense via API would go here
                        // e.g., updateExpense({ id: expenseId, receiptUrl: null })
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Image Viewer */}
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                centerContent
            >
                <TouchableOpacity activeOpacity={1} onPress={toggleHeader}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </ScrollView>

            {/* Header Overlay */}
            {headerVisible && (
                <SafeAreaView style={styles.header} edges={['top']}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                            <Ionicons name="share-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                            <Ionicons name="trash-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            )}

            {/* Bottom Details Overlay */}
            {headerVisible && (
                <SafeAreaView style={styles.footer} edges={['bottom']}>
                    <View>
                        <Text style={styles.footerTitle}>{description}</Text>
                        <Text style={styles.footerDate}>{new Date(date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.footerAmount}>${Number(amount).toFixed(2)}</Text>
                </SafeAreaView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    scrollContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    image: { width: width, height: height * 0.8 },

    header: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    headerRight: { flexDirection: 'row' },
    iconBtn: { padding: 8, marginHorizontal: 4 },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 20,
        backgroundColor: 'rgba(0,0,0,0.6)'
    },
    footerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    footerDate: { color: '#ccc', fontSize: 14 },
    footerAmount: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
});
