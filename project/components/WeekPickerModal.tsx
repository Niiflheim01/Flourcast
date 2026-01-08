import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface WeekPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectWeek: (weekStart: Date) => void;
  selectedWeekStart: Date;
}

export function WeekPickerModal({ visible, onClose, onSelectWeek, selectedWeekStart }: WeekPickerModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Reset to month containing selected week when modal opens
    if (visible) {
      setCurrentDate(new Date(selectedWeekStart));
    }
  }, [visible, selectedWeekStart]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getWeekStartDate = (day: number): Date => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek; // Adjust to get Sunday
    return new Date(date.getFullYear(), date.getMonth(), diff);
  };

  const getWeekEndDate = (weekStart: Date): Date => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  };

  const isInSelectedWeek = (day: number): boolean => {
    if (!day) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const weekStart = getWeekStartDate(day);
    const weekEnd = getWeekEndDate(weekStart);
    
    const selectedStart = new Date(selectedWeekStart);
    selectedStart.setHours(0, 0, 0, 0);
    
    return weekStart.getTime() === selectedStart.getTime();
  };

  const isToday = (day: number): boolean => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isFutureWeek = (day: number): boolean => {
    if (!day) return false;
    const weekStart = getWeekStartDate(day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return weekStart > today;
  };

  const handleDayPress = (day: number) => {
    if (!day || isFutureWeek(day)) return;
    const weekStart = getWeekStartDate(day);
    onSelectWeek(weekStart);
    onClose();
  };

  const handleTodayPress = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    onSelectWeek(weekStart);
    onClose();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    const today = new Date();
    // Don't allow navigating to future months beyond current
    if (nextDate.getFullYear() < today.getFullYear() || 
        (nextDate.getFullYear() === today.getFullYear() && nextDate.getMonth() <= today.getMonth())) {
      setCurrentDate(nextDate);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = getDaysInMonth(currentDate);

  // Check if we can go to next month
  const today = new Date();
  const canGoNext = currentDate.getFullYear() < today.getFullYear() ||
    (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());

  // Format selected week range for display
  const selectedEnd = getWeekEndDate(selectedWeekStart);
  const selectedRangeStr = `${selectedWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${selectedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Week</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.selectedWeekCard}>
            <Text style={styles.selectedWeekLabel}>Selected Week</Text>
            <Text style={styles.selectedWeekRange}>{selectedRangeStr}</Text>
          </View>

          <TouchableOpacity style={styles.todayButton} onPress={handleTodayPress}>
            <Text style={styles.todayButtonText}>Go to Current Week</Text>
          </TouchableOpacity>

          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
              <ChevronLeft size={24} color="#8B6F47" />
            </TouchableOpacity>
            <Text style={styles.monthYear}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity 
              onPress={nextMonth} 
              style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
              disabled={!canGoNext}>
              <ChevronRight size={24} color={canGoNext ? "#8B6F47" : "#D1D5DB"} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isSelected = day ? isInSelectedWeek(day) : false;
              const isTodayDate = day ? isToday(day) : false;
              const isFuture = day ? isFutureWeek(day) : false;
              const isWeekStart = day !== null && index % 7 === 0;
              const isWeekEnd = day !== null && (index + 1) % 7 === 0;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDay,
                    isSelected && isWeekStart ? styles.selectedDayStart : null,
                    isSelected && isWeekEnd ? styles.selectedDayEnd : null,
                    isFuture && styles.futureDay,
                  ]}
                  onPress={() => day && handleDayPress(day)}
                  disabled={!day || isFuture}>
                  {day && (
                    <View style={[styles.dayInner, isTodayDate && styles.todayDay]}>
                      <Text style={[
                        styles.dayText, 
                        isSelected && styles.selectedDayText,
                        isFuture && styles.futureDayText,
                        isTodayDate && styles.todayDayText,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.helpText}>
            Tap any day to select that week (Sunday - Saturday)
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDE4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#A67B5B',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectedWeekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  selectedWeekLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  selectedWeekRange: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D3A1A',
  },
  todayButton: {
    backgroundColor: '#8B5A2B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#DDD0C0',
  },
  selectedDayStart: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  selectedDayEnd: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#C89D5E',
    borderRadius: 8,
    backgroundColor: '#FFF8E1',
  },
  futureDay: {
    opacity: 0.4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedDayText: {
    color: '#5D3A1A',
    fontWeight: '700',
  },
  futureDayText: {
    color: '#9CA3AF',
  },
  todayDayText: {
    color: '#8B5A2B',
    fontWeight: '700',
  },
  helpText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
