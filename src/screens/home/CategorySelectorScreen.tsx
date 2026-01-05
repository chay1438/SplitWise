import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CategorySelector'>;

const CATEGORIES = [
    { id: '1', name: 'Food & Dining', icon: 'fast-food' },
    { id: '2', name: 'Entertainment', icon: 'film' },
    { id: '3', name: 'Transportation', icon: 'car' },
    { id: '4', name: 'Shopping', icon: 'cart' },
    { id: '5', name: 'Housing', icon: 'home' },
    { id: '6', name: 'Healthcare', icon: 'medkit' },
    { id: '7', name: 'Education', icon: 'school' },
    { id: '8', name: 'Travel', icon: 'airplane' },
    { id: '9', name: 'Utilities', icon: 'flash' },
    { id: '10', name: 'General', icon: 'pricetag' },
];

export default function CategorySelectorScreen({ navigation, route }: Props) {
    const { onSelect } = route.params;

    const handleSelect = (category: string) => {
        if (onSelect) {
            onSelect(category);
        }
        navigation.goBack();
    };

    const renderItem = ({ item }: { item: typeof CATEGORIES[0] }) => (
        <TouchableOpacity style={styles.item} onPress={() => handleSelect(item.name)}>
            <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={28} color={Colors.primary} />
            </View>
            <Text style={styles.itemName}>{item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Select Category</Text>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                data={CATEGORIES}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={styles.list}
                ListFooterComponent={
                    <TouchableOpacity style={styles.addItem} onPress={() => alert('Custom categories coming soon!')}>
                        <View style={[styles.iconBox, styles.addBox]}>
                            <Ionicons name="add" size={32} color="#999" />
                        </View>
                        <Text style={styles.itemName}>Add Custom</Text>
                    </TouchableOpacity>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    closeBtn: { padding: 4 },
    list: { padding: 20 },
    item: {
        flex: 1, alignItems: 'center', marginBottom: 24, marginHorizontal: 4,
        minWidth: '30%'
    },
    iconBox: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: '#f9f9f9',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
        borderWidth: 1, borderColor: '#eee'
    },
    itemName: { fontSize: 12, color: '#333', textAlign: 'center', fontWeight: '500' },

    addItem: { marginTop: 0, width: '33%', alignItems: 'center' },
    addBox: { borderStyle: 'dashed', borderColor: '#ccc' }
});
