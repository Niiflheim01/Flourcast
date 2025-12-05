import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Plus, Bell, Trash2 } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CalendarNote {
  id: string;
  date: string;
  text: string;
  hasReminder: boolean;
  reminderTime?: string;
  notificationId?: string;
}

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onNotesChange?: () => void;
}

export function CalendarModal({ visible, onClose, userId, onNotesChange }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingHour, setEditingHour] = useState(7);
  const [editingMinute, setEditingMinute] = useState(0);
  const [editingPeriod, setEditingPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    loadNotes();
    requestNotificationPermissions();
  }, [userId]);

  useEffect(() => {
    // Reset to current date whenever modal is opened
    if (visible) {
      setCurrentDate(new Date());
    }
  }, [visible]);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to use reminders.');
    }
  };

  const loadNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem(`calendar_notes_${userId}`);
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const saveNotes = async (updatedNotes: CalendarNote[]) => {
    try {
      await AsyncStorage.setItem(`calendar_notes_${userId}`, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
      onNotesChange?.(); // Notify dashboard to refresh reminders
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const scheduleNotification = async (note: CalendarNote) => {
    if (!note.hasReminder || !note.reminderTime) return null;

    const [hours, minutes] = note.reminderTime.split(':').map(Number);
    const notificationDate = new Date(note.date);
    notificationDate.setHours(hours, minutes, 0, 0);

    if (notificationDate < new Date()) {
      Alert.alert('Invalid Time', 'Reminder time must be in the future.');
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Flourcast Reminder',
          body: note.text,
          sound: true,
        },
        trigger: notificationDate as any,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Could not schedule reminder. Please try again.');
      return null;
    }
  };

  const addNote = async () => {
    if (!selectedDate || !noteText.trim()) {
      Alert.alert('Error', 'Please enter a note.');
      return;
    }

    const newNote: CalendarNote = {
      id: Date.now().toString(),
      date: selectedDate,
      text: noteText.trim(),
      hasReminder: false,
    };

    const updatedNotes = [...notes, newNote];
    await saveNotes(updatedNotes);
    setNoteText('');
    setShowNoteInput(false);
  };

  const addReminder = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    // Convert 12-hour format with AM/PM to 24-hour format
    let hour24 = editingHour;
    if (editingPeriod === 'PM' && editingHour !== 12) {
      hour24 = editingHour + 12;
    } else if (editingPeriod === 'AM' && editingHour === 12) {
      hour24 = 0;
    }
    const time24 = `${String(hour24).padStart(2, '0')}:${String(editingMinute).padStart(2, '0')}`;
    const displayTime = `${String(editingHour).padStart(2, '0')}:${String(editingMinute).padStart(2, '0')} ${editingPeriod}`;

    const updatedNote = {
      ...note,
      hasReminder: true,
      reminderTime: displayTime,
    };

    const notificationId = await scheduleNotification({ ...updatedNote, reminderTime: time24 });
    if (notificationId) {
      updatedNote.notificationId = notificationId;
      const updatedNotes = notes.map(n => (n.id === noteId ? updatedNote : n));
      await saveNotes(updatedNotes);
      setEditingReminderId(null);
      Alert.alert('Success', 'Reminder set successfully!');
    }
  };

  const deleteNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(note.notificationId);
    }
    const updatedNotes = notes.filter(n => n.id !== noteId);
    await saveNotes(updatedNotes);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatDateString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getNotesForDate = (dateStr: string) => {
    return notes.filter(note => note.date === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = getDaysInMonth(currentDate);
  const selectedNotes = selectedDate ? getNotesForDate(selectedDate) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#3a3a3a" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
            <ChevronLeft size={24} color="#8B6F47" />
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <ChevronRight size={24} color="#8B6F47" />
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
            const dateStr = day ? formatDateString(day) : '';
            const hasNotes = day && getNotesForDate(dateStr).length > 0;
            const isSelected = dateStr === selectedDate;
            const isToday =
              day &&
              new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isSelected && styles.selectedDay,
                  isToday ? styles.todayDay : null,
                ]}
                onPress={() => day && setSelectedDate(dateStr)}
                disabled={!day}>
                {day && (
                  <>
                    <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
                      {day}
                    </Text>
                    {hasNotes && <View style={styles.noteDot} />}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedDate && (
          <View style={styles.notesSection}>
            <View style={styles.notesSectionHeader}>
              <Text style={styles.notesSectionTitle}>
                Notes for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <TouchableOpacity
                onPress={() => setShowNoteInput(!showNoteInput)}
                style={styles.addButton}>
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {showNoteInput && (
              <View style={styles.noteInput}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your note..."
                  placeholderTextColor="#8B7355"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                />
                <View style={styles.inputActions}>
                  <TouchableOpacity onPress={addNote} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowNoteInput(false);
                      setNoteText('');
                    }}
                    style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <ScrollView style={styles.notesList} showsVerticalScrollIndicator={false}>
              {selectedNotes.map(note => (
                <View key={note.id} style={styles.noteCard}>
                  <Text style={styles.noteCardText}>{note.text}</Text>
                  <View style={styles.noteActions}>
                    {!note.hasReminder && editingReminderId !== note.id && (
                      <TouchableOpacity
                        onPress={() => {
                          setEditingReminderId(note.id);
                          setEditingHour(7);
                          setEditingMinute(0);
                          setEditingPeriod('AM');
                        }}
                        style={styles.reminderButton}>
                        <Bell size={16} color="#8B6F47" />
                        <Text style={styles.reminderButtonText}>Set Reminder</Text>
                      </TouchableOpacity>
                    )}
                    {!note.hasReminder && editingReminderId === note.id && (
                      <View style={styles.timePickerContainer}>
                        <View style={styles.timePickerMain}>
                          <View style={styles.wheelPickerContainer}>
                            {/* Hour Wheel */}
                            <ScrollView 
                              style={styles.wheelColumn}
                              showsVerticalScrollIndicator={false}
                              snapToInterval={44}
                              decelerationRate="fast"
                              contentContainerStyle={{ paddingVertical: 88 }}
                              onMomentumScrollEnd={(e) => {
                                const y = e.nativeEvent.contentOffset.y;
                                const index = Math.round(y / 44);
                                const hour = Math.max(1, Math.min(12, index + 1));
                                setEditingHour(hour);
                              }}>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                                <TouchableOpacity
                                  key={hour}
                                  style={styles.wheelItem}
                                  onPress={() => setEditingHour(hour)}>
                                  <Text style={[
                                    styles.wheelText,
                                    editingHour === hour && styles.wheelTextActive
                                  ]}>
                                    {hour}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>

                            {/* Minute Wheel */}
                            <ScrollView 
                              style={styles.wheelColumn}
                              showsVerticalScrollIndicator={false}
                              snapToInterval={44}
                              decelerationRate="fast"
                              contentContainerStyle={{ paddingVertical: 88 }}
                              onMomentumScrollEnd={(e) => {
                                const y = e.nativeEvent.contentOffset.y;
                                const index = Math.round(y / 44);
                                const minute = Math.max(0, Math.min(59, index));
                                setEditingMinute(minute);
                              }}>
                              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                <TouchableOpacity
                                  key={minute}
                                  style={styles.wheelItem}
                                  onPress={() => setEditingMinute(minute)}>
                                  <Text style={[
                                    styles.wheelText,
                                    editingMinute === minute && styles.wheelTextActive
                                  ]}>
                                    {String(minute).padStart(2, '0')}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>

                            {/* AM/PM Wheel */}
                            <ScrollView 
                              style={styles.wheelColumn}
                              showsVerticalScrollIndicator={false}
                              snapToInterval={44}
                              decelerationRate="fast"
                              contentContainerStyle={{ paddingVertical: 88 }}>
                              {['AM', 'PM'].map((period) => (
                                <TouchableOpacity
                                  key={period}
                                  style={styles.wheelItem}
                                  onPress={() => setEditingPeriod(period as 'AM' | 'PM')}>
                                  <Text style={[
                                    styles.wheelText,
                                    editingPeriod === period && styles.wheelTextActive
                                  ]}>
                                    {period}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>

                            {/* Selection Indicator Overlay */}
                            <View style={styles.selectionIndicator} pointerEvents="none" />
                          </View>
                        </View>
                        <View style={styles.timePickerActions}>
                          <TouchableOpacity
                            onPress={() => setEditingReminderId(null)}
                            style={styles.timePickerCancelButton}>
                            <Text style={styles.timePickerCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => addReminder(note.id)}
                            style={styles.timePickerOkButton}>
                            <Text style={styles.timePickerOkText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    {note.hasReminder && (
                      <View style={styles.reminderSetContainer}>
                        <Bell size={14} color="#8B6F47" />
                        <Text style={styles.reminderSetText}>{note.reminderTime}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Delete Note', 'Are you sure?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', onPress: () => deleteNote(note.id), style: 'destructive' },
                        ]);
                      }}
                      style={styles.deleteButton}>
                      <Trash2 size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {selectedNotes.length === 0 && (
                <Text style={styles.emptyText}>No notes for this date</Text>
              )}
            </ScrollView>
          </View>
        )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8DCC8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#D4BA9C',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  scrollView: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3a3a3a',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  closeButton: {
    padding: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3a3a3a',
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
    color: '#6B5439',
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
    padding: 4,
  },
  selectedDay: {
    backgroundColor: '#8B6F47',
    borderRadius: 12,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#C89D5E',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3a3a3a',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noteDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DC6B19',
    marginTop: 2,
  },
  notesSection: {
    flex: 1,
    backgroundColor: '#D4BA9C',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3a3a3a',
  },
  addButton: {
    backgroundColor: '#8B6F47',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 14,
    color: '#3a3a3a',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8B6F47',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#C4AA8C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B5439',
    fontWeight: '600',
    fontSize: 14,
  },
  notesList: {
    flex: 1,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  noteCardText: {
    fontSize: 14,
    color: '#3a3a3a',
    marginBottom: 10,
    lineHeight: 20,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5E6D3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reminderButtonText: {
    fontSize: 12,
    color: '#8B6F47',
    fontWeight: '600',
  },
  reminderEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4BA9C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    color: '#3a3a3a',
    width: 70,
    textAlign: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#8B6F47',
  },
  periodText: {
    fontSize: 11,
    color: '#6B5439',
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  saveTimeButton: {
    backgroundColor: '#8B6F47',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveTimeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelTimeButton: {
    padding: 6,
  },
  reminderSetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5E6D3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reminderSetText: {
    fontSize: 12,
    color: '#8B6F47',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 14,
    marginTop: 20,
  },
  timePickerContainer: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 16,
    width: 320,
    alignSelf: 'center',
  },
  timePickerMain: {
    width: '100%',
    marginBottom: 20,
  },
  wheelPickerContainer: {
    flexDirection: 'row',
    height: 220,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  wheelColumn: {
    flex: 1,
    height: 220,
  },
  wheelItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText: {
    fontSize: 22,
    color: '#666666',
    fontWeight: '400',
  },
  wheelTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 24,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 88,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: 'rgba(139, 111, 71, 0.3)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(139, 111, 71, 0.5)',
    pointerEvents: 'none',
  },

  timePickerActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  timePickerCancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timePickerOkButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: 17,
    color: '#C89D5E',
    fontWeight: '400',
  },
  timePickerOkText: {
    fontSize: 17,
    color: '#C89D5E',
    fontWeight: '600',
  },
});
