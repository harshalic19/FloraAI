import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plant, RootTabParamList } from '../types';
import {
  deletePlant,
  getDaysUntilWatering,
  getPlants,
  updatePlant,
} from '../storage/plantStorage';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

type NavProp = BottomTabNavigationProp<RootTabParamList>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function WateringBadge({ days }: { days: number }) {
  let bg = Colors.accentLight;
  let textColor = Colors.primaryDark;
  let label = `Water in ${days}d`;

  if (days < 0) {
    bg = '#FFE5DC';
    textColor = Colors.danger;
    label = `${Math.abs(days)}d overdue`;
  } else if (days === 0) {
    bg = '#FFF3CD';
    textColor = '#856404';
    label = 'Water today';
  } else if (days === 1) {
    bg = '#FFF3CD';
    textColor = '#856404';
    label = 'Water tomorrow';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function PlantCard({
  plant,
  onPress,
  onWater,
  onDelete,
}: {
  plant: Plant;
  onPress: () => void;
  onWater: () => void;
  onDelete: () => void;
}) {
  const days = getDaysUntilWatering(plant);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{plant.emoji ?? '🪴'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.plantName} numberOfLines={1}>
            {plant.name}
          </Text>
          <Text style={styles.plantType}>{plant.type}</Text>
          <WateringBadge days={days} />
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.waterBtn} onPress={onWater}>
          <Text style={styles.waterBtnText}>💧</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getPlants();
    setPlants(data.sort((a, b) => getDaysUntilWatering(a) - getDaysUntilWatering(b)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleWater = async (plant: Plant) => {
    const updated = { ...plant, lastWatered: new Date().toISOString() };
    await updatePlant(updated);
    await load();
  };

  const handleDelete = (plant: Plant) => {
    Alert.alert('Remove Plant', `Remove "${plant.name}" from your garden?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deletePlant(plant.id);
          await load();
        },
      },
    ]);
  };

  const handlePlantPress = (plant: Plant) => {
    (navigation as any).navigate('PlantDetail', { plantId: plant.id });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.greeting}>{getGreeting()} 🌿</Text>
        <Text style={styles.subtitle}>
          {plants.length === 0
            ? 'Add your first plant to get started'
            : `You have ${plants.length} plant${plants.length !== 1 ? 's' : ''} in your garden`}
        </Text>
      </View>

      {plants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🪴</Text>
          <Text style={styles.emptyTitle}>Your garden is empty</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + tab below to add your first plant
          </Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <PlantCard
              plant={item}
              onPress={() => handlePlantPress(item)}
              onWater={() => handleWater(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.fontSizeDisplay,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emojiContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  plantName: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.text,
  },
  plantType: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  badgeText: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
  },
  cardActions: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  waterBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBtnText: {
    fontSize: 18,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 72,
  },
  emptyTitle: {
    fontSize: Typography.fontSizeXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
