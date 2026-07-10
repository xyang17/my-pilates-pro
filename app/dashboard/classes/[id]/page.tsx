'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useToast } from '@/context/ToastContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface MasterExercise {
  id: string
  name_en: string
  name_cn: string
}

interface ClassExercise {
  id: string
  exercise_id: string
  sets?: number
  reps?: number
  weight?: number
  weight_unit: string
  duration?: number
  duration_unit: string
  order: number
  instance_notes?: string
  actual_sets?: number
  actual_reps?: number
  actual_weight?: number
  post_note?: string
  master_exercise: MasterExercise
}

interface StudentNote {
  id: string
  exercise_instance_id: string
  student_id: string
  student_name?: string
  content: string
  created_at: string
}

interface TrainerInfo {
  id: string
  name: string
  bio?: string
  photo_url?: string
  certificate?: string
}

interface ClassData {
  id: string
  name: string
  date: string
  start_time?: string
  duration: number
  type: string
  discipline?: string
  class_type: 'private' | 'group'
  level?: string
  description?: string
  max_capacity?: number
  price?: number
  color?: string
  cover_image_url?: string
  trainer_id?: string
  assigned_to?: string
  status: 'planned' | 'in_progress' | 'completed'
  notes?: string
  post_summary?: string
  completed_at?: string
  exercises: ClassExercise[]
  created_by: string
}

const STATUS_CONFIG: Record<string, { bar: string; bg: string; color: string; border: string; label: string; dot: string }> = {
  planned:     { bar: '#C2AFCC', bg: '#EDE6F4', color: '#9888B0', border: '1px solid #C2AFCC',   label: '未开始', dot: '○' },
  in_progress: { bar: '#9880B8', bg: '#C2AFCC', color: '#fff',    border: '1px solid #9880B8',   label: '进行中', dot: '●' },
  completed:   { bar: '#9880B8', bg: '#EDE6F4', color: '#5A4878', border: '1.5px solid #9880B8', label: '已完成', dot: '✓' },
}
// legacy aliases kept for any remaining references
const STATUS_COLOR: Record<string, string> = { planned: '#C2AFCC', in_progress: '#9880B8', completed: '#9880B8' }
const STATUS_LABEL: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }

export default function ClassDetailPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null)
  const [classPhotos, setClassPhotos] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [availableExercises, setAvailableExercises] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'exercises' | 'student-notes' | 'distributed'>('exercises')
  const [distributedHomework, setDistributedHomework] = useState<any[]>([])
  const [loadingDistributed, setLoadingDistributed] = useState(false)
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([])
  // Spreadsheet inline editing
  const [localParams, setLocalParams] = useState<Record<string, {sets:string,reps:string,weight:string,weight_unit:string,duration:string,duration_unit:string,instance_notes:string}>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  // Quick-add search
  const [addSearch, setAddSearch] = useState('')
  const [addFilterAll, setAddFilterAll] = useState(false)
  const [adding, setAdding] = useState(false)
  // Homework modal
  const [showHomework, setShowHomework] = useState(false)
  const [homeworkSelected, setHomeworkSelected] = useState<Set<string>>(new Set())
  const [homeworkDueDate, setHomeworkDueDate] = useState('')
  const [homeworkNotes, setHomeworkNotes] = useState('')
  const [homeworkStudentId, setHomeworkStudentId] = useState('')
  const [homeworkSubmitting, setHomeworkSubmitting] = useState(false)
  // Group class distribute
  const [showDistribute, setShowDistribute] = useState(false)
  const [distributeSelected, setDistributeSelected] = useState<Set<string>>(new Set())
  const [distributing, setDistributing] = useState(false)
  // Homework extra exercises (non-class)
  const [hwExtraSearch, setHwExtraSearch] = useState('')
  const [hwExtraSelected, setHwExtraSelected] = useState<Set<string>>(new Set())
  const [showHwLibrary, setShowHwLibrary] = useState(false)
  const [hwLibSearch, setHwLibSearch] = useState('')
  const [hwLibFilterType, setHwLibFilterType] = useState('')
  const [hwLibFilterDiff, setHwLibFilterDiff] = useState('')
  const [hwLibFilterMuscle, setHwLibFilterMuscle] = useState('')
  const [hwLibFilterSeries, setHwLibFilterSeries] = useState('')
  // Client list for student dropdown
  const [clientList, setClientList] = useState<{id:string,name:string,email:string}[]>([])
  // Exercise library (inline)
  const [libSearch, setLibSearch] = useState('')
  const [libFilterType, setLibFilterType] = useState('')
  const [libFilterDiff, setLibFilterDiff] = useState('')
  const [libFilterMuscle, setLibFilterMuscle] = useState('')
  const [libFilterSeries, setLibFilterSeries] = useState('')
  // Class copy modal
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyForm, setCopyForm] = useState({ name: '', date: '', start_time: '', assigned_to: '' })
  const [copying, setCopying] = useState(false)
  const [copyExercises, setCopyExercises] = useState<ClassExercise[]>([])
  // Drag-to-reorder
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  // Class info inline edit
  const [editInfo, setEditInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({ name: '', date: '', start_time: '', duration: '', discipline: '', level: '', notes: '', assigned_to: '' })
  const [savingInfo, setSavingInfo] = useState(false)
  // Assigned client profile (private class)
  const [assignedClient, setAssignedClient] = useState<{ id: string; name: string; email: string; photo_url?: string; bio?: string; injury_notes?: string; goals?: string } | null>(null)
  // Group class enrollment roster
  const [enrollments, setEnrollments] = useState<{ id: string; enrolled_at: string; student: { id: string; name: string; email: string; photo_url?: string } }[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [showAddEnrollment, setShowAddEnrollment] = useState(false)
  const [enrollmentSearch, setEnrollmentSearch] = useState('')

  const { lang, t } = useLang()
  const { showToast } = useToast()
  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'
  const isGroupClass = classData?.class_type === 'group'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user) {
      fetchClassData()
      if (isTrainer) fetchAvailableExercises()
    }
  }, [user, authLoading])

  useEffect(() => {
    if (classData?.class_type === 'group' && isTrainer && user) {
      fetchEnrollments()
    }
  }, [classData?.id, classData?.class_type, isTrainer, user])

  // Fetch assigned client profile when class data arrives
  useEffect(() => {
    if (classData?.assigned_to && isTrainer && user) {
      fetch(`/api/clients/${classData.assigned_to}`, {
        headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setAssignedClient(d) })
        .catch(() => {})
    }
  }, [classData?.assigned_to, isTrainer, user])

  // Fetch student notes when switching to that tab
  useEffect(() => {
    if (activeTab === 'student-notes' && classData) {
      fetchStudentNotes()
    }
    if (activeTab === 'distributed' && classData) {
      fetchDistributedHomework()
    }
  }, [activeTab, classData])

  const fetchClassData = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error('Failed to fetch class')
      const data: ClassData = await res.json()
      setClassData(data)

      // Fetch trainer info if trainer_id exists
      if (data.trainer_id) {
        const tRes = await fetch(`/api/trainers/${data.trainer_id}`, {
          headers: { 'x-user-id': user?.id || '' },
        })
        if (tRes.ok) {
          const t = await tRes.json()
          setTrainerInfo({ id: t.id, name: t.name, bio: t.bio, photo_url: t.photo_url, certificate: t.certificate })
        }
      }

      // Fetch class photos
      const pRes = await fetch(`/api/classes/${classId}/photos`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (pRes.ok) {
        const photos = await pRes.json()
        setClassPhotos(photos.map((p: any) => p.url))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableExercises = async () => {
    try {
      const res = await fetch('/api/exercises', {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) {
        const data = await res.json()
        setAvailableExercises(data)
      }
    } catch { /* non-critical */ }
  }

  const fetchClients = async () => {
    if (clientList.length > 0) return // already loaded
    try {
      const res = await fetch('/api/clients', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setClientList(await res.json())
    } catch { /* non-critical */ }
  }

  const fetchEnrollments = async () => {
    if (loadingEnrollments) return
    setLoadingEnrollments(true)
    try {
      // Step 1: get enrollments
      const { data: rows, error: e1 } = await supabase
        .from('class_enrollment')
        .select('id, enrolled_at, student_id')
        .eq('class_id', classId)
        .order('enrolled_at', { ascending: true })
      if (e1 || !rows || rows.length === 0) { setEnrollments([]); return }

      // Step 2: fetch user details
      const ids = rows.map((r: any) => r.student_id)
      const { data: users } = await supabase
        .from('user')
        .select('id, name, email, photo_url')
        .in('id', ids)
      const map: Record<string, any> = {}
      for (const u of users || []) map[u.id] = u

      setEnrollments(rows.map((r: any) => ({
        id: r.id,
        enrolled_at: r.enrolled_at,
        student: map[r.student_id] || { id: r.student_id, name: '', email: '', photo_url: null },
      })))
    } catch { /* non-critical */ }
    finally { setLoadingEnrollments(false) }
  }

  const handleAddEnrollment = async (studentId: string) => {
    try {
      const { data: row, error } = await supabase
        .from('class_enrollment')
        .insert([{ class_id: classId, student_id: studentId }])
        .select('id, enrolled_at, student_id')
        .single()
      if (error) {
        if (error.code === '23505') throw new Error('该学员已在名单中')
        throw new Error(error.message)
      }
      const { data: student } = await supabase
        .from('user')
        .select('id, name, email, photo_url')
        .eq('id', studentId)
        .single()
      setEnrollments(prev => [...prev, { id: row.id, enrolled_at: row.enrolled_at, student: student! }])
      setEnrollmentSearch('')
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const handleRemoveEnrollment = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('class_enrollment')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId)
      if (error) throw new Error(error.message)
      setEnrollments(prev => prev.filter(e => e.student.id !== studentId))
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const fetchStudentNotes = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}/student-notes`, {
        headers: {
          'x-user-id': user?.id || '',
          'x-user-role': userRole || '',
        },
      })
      if (res.ok) setStudentNotes(await res.json())
    } catch { /* non-critical */ }
  }

  const fetchDistributedHomework = async () => {
    if (loadingDistributed) return
    setLoadingDistributed(true)
    try {
      const res = await fetch(`/api/homework?class_id=${classId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setDistributedHomework(await res.json())
    } catch { /* non-critical */ }
    finally { setLoadingDistributed(false) }
  }

  // Spreadsheet helpers
  const getLocal = (ex: ClassExercise) => localParams[ex.id] || {
    sets: ex.sets?.toString() || '',
    reps: ex.reps?.toString() || '',
    weight: ex.weight?.toString() || '',
    weight_unit: ex.weight_unit || 'kg',
    duration: ex.duration?.toString() || '',
    duration_unit: ex.duration_unit || 'minutes',
    instance_notes: ex.instance_notes || '',
  }

  const updateLocal = (id: string, field: string, value: string) => {
    setLocalParams(prev => ({
      ...prev,
      [id]: { ...((prev[id]) || {}), [field]: value } as any
    }))
  }

  type ExerciseField = 'sets' | 'reps' | 'weight' | 'weight_unit' | 'duration' | 'duration_unit' | 'instance_notes'

  const saveField = async (ex: ClassExercise, field: ExerciseField) => {
    const p = getLocal(ex)
    const current = p[field]

    // Compare to DB value for this specific field only
    const dbVal = ((): string => {
      switch (field) {
        case 'sets':           return ex.sets?.toString()     || ''
        case 'reps':           return ex.reps?.toString()     || ''
        case 'weight':         return ex.weight?.toString()   || ''
        case 'weight_unit':    return ex.weight_unit          || 'kg'
        case 'duration':       return ex.duration?.toString() || ''
        case 'duration_unit':  return ex.duration_unit        || 'minutes'
        case 'instance_notes': return ex.instance_notes       || ''
      }
    })()
    if (current === dbVal) return // no change

    // Convert string → DB type
    let dbValue: number | string | null
    switch (field) {
      case 'sets':     dbValue = current ? parseInt(current)           : null; break
      case 'reps':     dbValue = current ? parseInt(current)           : null; break
      case 'weight':   dbValue = current !== '' ? parseFloat(current)  : null; break
      case 'duration': dbValue = current ? parseInt(current)           : null; break
      default:         dbValue = current || null
    }

    setSavingIds(prev => new Set(prev).add(ex.id))
    try {
      const res = await fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ [field]: dbValue }),
      })
      if (res.ok) {
        // Patch only this one field in classData — never touch localParams
        // hasUnsaved recalculates automatically: once classData matches localParams, field is clean
        setClassData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            exercises: prev.exercises.map(e => {
              if (e.id !== ex.id) return e
              const updated = { ...e } as ClassExercise
              switch (field) {
                case 'sets':           updated.sets           = (dbValue as number | null) ?? undefined; break
                case 'reps':           updated.reps           = (dbValue as number | null) ?? undefined; break
                case 'weight':         updated.weight         = (dbValue as number | null) ?? undefined; break
                case 'weight_unit':    updated.weight_unit    = current || 'kg';              break
                case 'duration':       updated.duration       = (dbValue as number | null) ?? undefined; break
                case 'duration_unit':  updated.duration_unit  = current || 'minutes';         break
                case 'instance_notes': updated.instance_notes = (dbValue as string | null) ?? undefined; break
              }
              return updated
            }),
          }
        })
      }
    } catch { /* non-critical */ }
    finally { setSavingIds(prev => { const s = new Set(prev); s.delete(ex.id); return s }) }
  }

  const handleAddExercise = async (exerciseId: string) => {
    if (!exerciseId || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/classes/${classId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({ exercise_id: exerciseId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      setAddSearch('')
      fetchClassData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleCreateHomework = async () => {
    const totalSelected = homeworkSelected.size + hwExtraSelected.size
    if (!homeworkStudentId || totalSelected === 0) return
    setHomeworkSubmitting(true)
    try {
      // Class exercises
      const classExercises = Array.from(homeworkSelected).map((instanceId, i) => {
        const ex = classData?.exercises.find(e => e.id === instanceId)
        return {
          exercise_id: ex?.exercise_id,
          class_instance_id: instanceId,
          sets: ex?.sets, reps: ex?.reps, weight: ex?.weight,
          weight_unit: ex?.weight_unit || 'kg', notes: ex?.instance_notes || '',
          order_num: i + 1,
        }
      })
      // Extra exercises from library
      const extraExercises = Array.from(hwExtraSelected).map((exId, i) => {
        const ex = availableExercises.find(e => e.id === exId)
        return {
          exercise_id: exId,
          class_instance_id: null,
          sets: ex?.default_sets || null, reps: ex?.default_reps || null, weight: ex?.default_weight || null,
          weight_unit: ex?.default_weight_unit || 'kg', notes: '',
          order_num: classExercises.length + i + 1,
        }
      })
      const exercises = [...classExercises, ...extraExercises]
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({
          class_id: classId, student_id: homeworkStudentId,
          title: `${classData?.name} ${t('作业', 'Homework')}`,
          due_date: homeworkDueDate || null, notes: homeworkNotes || null, exercises,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create homework')
      }
      setShowHomework(false)
      setHomeworkSelected(new Set())
      setHwExtraSelected(new Set())
      setHwExtraSearch('')
      setHomeworkStudentId('')
      setHomeworkDueDate('')
      setHomeworkNotes('')
      showToast(t('作业已布置！', 'Homework assigned!'))
    } catch (err: any) { showToast(err.message, 'error') }
    finally { setHomeworkSubmitting(false) }
  }

  const handleDistribute = async () => {
    if (distributeSelected.size === 0) return
    setDistributing(true)
    try {
      const res = await fetch(`/api/classes/${classId}/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({ client_ids: Array.from(distributeSelected) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to distribute')
      setShowDistribute(false)
      setDistributeSelected(new Set())
      const msg = data.skipped > 0
        ? t(`已发送 ${data.created} 人，${data.skipped} 人之前已发过（跳过）`, `Sent to ${data.created}, skipped ${data.skipped} (already sent)`)
        : t(`已发送给 ${data.created} 位学员`, `Sent to ${data.created} clients`)
      showToast(msg)
    } catch (err: any) { showToast(err.message, 'error') }
    finally { setDistributing(false) }
  }

  const openCopyModal = async () => {
    if (!classData) return
    const baseName = classData.name.replace(/\s*\(复制\)+$/, '')
    fetchClients()
    setCopyForm({
      name: baseName,
      date: '',
      start_time: classData.start_time?.slice(0, 5) || '',
      assigned_to: classData.assigned_to || '',
    })
    // Re-fetch exercises fresh from DB so copy always reflects latest saved state
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) {
        const fresh = await res.json()
        const sorted = (fresh.exercises || []).sort((a: ClassExercise, b: ClassExercise) => a.order - b.order)
        setCopyExercises(sorted)
      } else {
        setCopyExercises([...classData.exercises].sort((a, b) => a.order - b.order))
      }
    } catch {
      setCopyExercises([...classData.exercises].sort((a, b) => a.order - b.order))
    }
    setShowCopyModal(true)
  }

  const handleCopyClass = async () => {
    if (!classData || copying || !copyForm.date) return
    setCopying(true)
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({
          name: copyForm.name || classData.name,
          date: copyForm.date,
          start_time: copyForm.start_time || null,
          duration: classData.duration,
          discipline: classData.discipline || classData.type,
          class_type: classData.class_type,
          level: classData.level || 'beginner',
          description: classData.description || null,
          max_capacity: classData.max_capacity || null,
          price: classData.price || null,
          color: classData.color || null,
          trainer_id: classData.trainer_id || null,
          assigned_to: copyForm.assigned_to || null,
          notes: classData.notes || null,
        }),
      })
      if (!res.ok) throw new Error('复制课程失败')
      const newClass = await res.json()

      // Copy exercises in user-selected order using fresh DB values
      for (const ex of copyExercises) {
        await fetch(`/api/classes/${newClass.id}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
          body: JSON.stringify({
            exercise_id:    ex.exercise_id,
            sets:           ex.sets          ?? null,
            reps:           ex.reps          ?? null,
            weight:         ex.weight        ?? null,
            weight_unit:    ex.weight_unit   || 'kg',
            duration:       ex.duration      ?? null,
            duration_unit:  ex.duration_unit || 'minutes',
            instance_notes: ex.instance_notes || null,
          }),
        })
      }

      setShowCopyModal(false)
      showToast(t('课程已复制！', 'Class copied!'))
      setTimeout(() => router.push(`/dashboard/classes/${newClass.id}`), 600)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setCopying(false)
    }
  }

  const openEditInfo = () => {
    if (!classData) return
    if (classData.class_type === 'private') fetchClients()
    setInfoForm({
      name: classData.name,
      date: classData.date,
      start_time: classData.start_time?.slice(0, 5) || '',
      duration: classData.duration.toString(),
      discipline: classData.discipline || classData.type || '',
      level: classData.level || '',
      notes: classData.notes || '',
      assigned_to: classData.assigned_to || '',
    })
    setEditInfo(true)
  }

  const handleSaveInfo = async () => {
    if (!classData || savingInfo) return
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          name: infoForm.name,
          date: infoForm.date,
          start_time: infoForm.start_time || null,
          duration: parseInt(infoForm.duration) || 60,
          discipline: infoForm.discipline,
          level: infoForm.level,
          notes: infoForm.notes || null,
          assigned_to: infoForm.assigned_to || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '保存失败')
      }
      await fetchClassData()
      setEditInfo(false)
      showToast(t('保存成功', 'Saved!'))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSavingInfo(false)
    }
  }

  const handleRemoveExercise = async (instanceId: string) => {
    if (!confirm('确认移除这个动作？')) return
    try {
      // Fixed: use path param instead of query param
      const res = await fetch(`/api/classes/${classId}/exercises/${instanceId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error('Failed to remove exercise')
      fetchClassData()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Check if any localParams differ from DB values
  const hasUnsaved = !!(classData?.exercises.some(ex => {
    const lp = localParams[ex.id]
    if (!lp) return false
    return (
      lp.sets          !== (ex.sets?.toString()     || '') ||
      lp.reps          !== (ex.reps?.toString()     || '') ||
      lp.weight        !== (ex.weight?.toString()   || '') ||
      lp.weight_unit   !== (ex.weight_unit          || 'kg') ||
      lp.instance_notes !== (ex.instance_notes      || '')
    )
  }))

  // Warn browser when closing/refreshing tab with unsaved changes
  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  const saveAll = async () => {
    if (!classData) return
    const dirty = classData.exercises.filter(ex => {
      const lp = localParams[ex.id]
      if (!lp) return false
      return (
        lp.sets           !== (ex.sets?.toString()     || '') ||
        lp.reps           !== (ex.reps?.toString()     || '') ||
        lp.weight         !== (ex.weight?.toString()   || '') ||
        lp.weight_unit    !== (ex.weight_unit          || 'kg') ||
        lp.instance_notes !== (ex.instance_notes       || '')
      )
    })
    if (dirty.length === 0) { showToast(t('没有未保存的更改', 'Nothing to save')); return }

    for (const ex of dirty) {
      const p = getLocal(ex)
      // Build payload with only dirty fields for this exercise
      const payload: Record<string, unknown> = {}
      if (p.sets           !== (ex.sets?.toString()     || '')) payload.sets           = p.sets ? parseInt(p.sets) : null
      if (p.reps           !== (ex.reps?.toString()     || '')) payload.reps           = p.reps ? parseInt(p.reps) : null
      if (p.weight         !== (ex.weight?.toString()   || '')) payload.weight         = p.weight !== '' ? parseFloat(p.weight) : null
      if (p.weight_unit    !== (ex.weight_unit          || 'kg')) payload.weight_unit  = p.weight_unit
      if (p.instance_notes !== (ex.instance_notes       || '')) payload.instance_notes = p.instance_notes || null

      setSavingIds(prev => new Set(prev).add(ex.id))
      try {
        const res = await fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setClassData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              exercises: prev.exercises.map(e => {
                if (e.id !== ex.id) return e
                const updated = { ...e } as ClassExercise
                if ('sets'           in payload) updated.sets           = (payload.sets           as number | null) ?? undefined
                if ('reps'           in payload) updated.reps           = (payload.reps           as number | null) ?? undefined
                if ('weight'         in payload) updated.weight         = (payload.weight         as number | null) ?? undefined
                if ('weight_unit'    in payload) updated.weight_unit    = payload.weight_unit as string
                if ('instance_notes' in payload) updated.instance_notes = (payload.instance_notes as string | null) ?? undefined
                return updated
              }),
            }
          })
        }
      } catch { /* non-critical */ }
      finally { setSavingIds(prev => { const s = new Set(prev); s.delete(ex.id); return s }) }
    }
    showToast(t(`已保存全部 ${dirty.length} 个动作`, `Saved ${dirty.length} exercises ✓`))
  }

  const handleDragStart = (id: string) => setDraggedId(id)

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== draggedId) setDragOverId(id)
  }

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId || !classData) return
    const sorted = [...classData.exercises].sort((a, b) => a.order - b.order)
    const fromIdx = sorted.findIndex(e => e.id === draggedId)
    const toIdx   = sorted.findIndex(e => e.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    // Optimistic update
    setClassData(prev => prev ? { ...prev, exercises: reordered.map((e, i) => ({ ...e, order: i + 1 })) } : prev)
    setDraggedId(null)
    setDragOverId(null)
    setReordering(true)
    try {
      await Promise.all(reordered.map((ex, i) =>
        fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
          body: JSON.stringify({ order: i + 1 }),
        })
      ))
    } catch { /* non-critical */ }
    finally { setReordering(false) }
  }

  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null) }

  // Touch drag-and-drop (mobile)
  useEffect(() => {
    if (!draggedId || !isTrainer) return
    let currentOverId: string | null = null

    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const row = el?.closest('[data-exercise-id]')
      const overId = row?.getAttribute('data-exercise-id') || null
      currentOverId = overId
      setDragOverId(overId && overId !== draggedId ? overId : null)
    }

    const onEnd = async () => {
      const targetId = currentOverId
      setDraggedId(null)
      setDragOverId(null)
      if (!targetId || targetId === draggedId || !classData) return
      const sorted = [...classData.exercises].sort((a, b) => a.order - b.order)
      const fromIdx = sorted.findIndex(e => e.id === draggedId)
      const toIdx   = sorted.findIndex(e => e.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return
      const reordered = [...sorted]
      const [moved] = reordered.splice(fromIdx, 1)
      reordered.splice(toIdx, 0, moved)
      setClassData(prev => prev ? { ...prev, exercises: reordered.map((e, i) => ({ ...e, order: i + 1 })) } : prev)
      setReordering(true)
      try {
        await Promise.all(reordered.map((ex, i) =>
          fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
            body: JSON.stringify({ order: i + 1 }),
          })
        ))
      } catch { } finally { setReordering(false) }
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [draggedId, classData, classId, user?.id, isTrainer])

  if (authLoading || isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--c-fill-mid)', borderTopColor: 'var(--c-brand)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
      </div>
    )
  }

  if (!classData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <p style={{ color: 'var(--c-text-secondary)', fontSize: 'var(--text-base)' }}>课程未找到</p>
        <Link href="/dashboard/classes" style={{ color: 'var(--c-brand)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回课程列表</Link>
      </div>
    )
  }

  const canReview = isTrainer && classData.class_type === 'private'
  const canAddStudentNote = !isTrainer && classData.class_type === 'group'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => {
            if (hasUnsaved && !window.confirm(t('有未保存的内容，确定离开？', 'You have unsaved changes. Leave anyway?'))) return
            router.push('/dashboard/classes')
          }}
          style={{ color: 'var(--c-text-secondary)', background: 'none', border: 'none', padding: 0, fontSize: 'var(--text-sm)', cursor: 'pointer', flexShrink: 0 }}
        >
          ← 返回
        </button>
        <h1 style={{ margin: '0 var(--sp-4)', fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{classData.name}</h1>
        {/* Action button based on status and role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexShrink: 0 }}>
          {canReview && classData.status !== 'completed' && (
            <Link href={`/dashboard/classes/${classId}/review`} style={{
              padding: '7px 14px', background: 'var(--c-brand)', color: '#fff',
              textDecoration: 'none', borderRadius: 'var(--r-sm)', fontSize: 'var(--text-sm)', fontWeight: 500,
            }}>
              复盘 →
            </Link>
          )}
          {canReview && classData.status === 'completed' && (
            <Link href={`/dashboard/classes/${classId}/review`} style={{
              padding: '7px 14px', background: 'var(--c-fill-light)', color: 'var(--c-text-primary)',
              textDecoration: 'none', borderRadius: 'var(--r-sm)', fontSize: 'var(--text-sm)',
              border: '1px solid var(--c-border)',
            }}>
              查看复盘
            </Link>
          )}
          {canAddStudentNote && (
            <Link href={`/dashboard/classes/${classId}/student-notes`} style={{
              padding: '7px 14px', background: 'var(--c-brand)', color: '#fff',
              textDecoration: 'none', borderRadius: 'var(--r-sm)', fontSize: 'var(--text-sm)', fontWeight: 500,
            }}>
              记录笔记
            </Link>
          )}
          {isTrainer && (
            <button onClick={openCopyModal} style={{
              padding: '7px 14px', background: 'var(--c-fill-light)', color: 'var(--c-text-primary)',
              border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--text-sm)', cursor: 'pointer',
            }}>
              复制计划
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 900, margin: '0 auto' }}>

        {/* Cover image */}
        {classData.cover_image_url && (
          <div style={{ marginBottom: '16px', borderRadius: '10px', overflow: 'hidden', maxHeight: '220px' }}>
            <img src={classData.cover_image_url} alt={classData.name}
              style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
          </div>
        )}

        {/* Class Info */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', padding: 'var(--sp-5)', borderRadius: 'var(--r-lg)', marginBottom: 'var(--sp-4)' }}>
          {/* Color stripe */}
          {classData.color && (
            <div style={{ height: '4px', backgroundColor: classData.color, borderRadius: '2px', marginBottom: '16px' }} />
          )}

          {editInfo ? (
            /* ── EDIT MODE ── */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>课程名称</label>
                  <input value={infoForm.name} onChange={e => setInfoForm(p => ({ ...p, name: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>日期</label>
                  <input type="date" value={infoForm.date} onChange={e => setInfoForm(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>开始时间</label>
                  <input type="time" value={infoForm.start_time} onChange={e => setInfoForm(p => ({ ...p, start_time: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>时长（分钟）</label>
                  <input type="number" min="1" value={infoForm.duration} onChange={e => setInfoForm(p => ({ ...p, duration: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>类别</label>
                  <input value={infoForm.discipline} onChange={e => setInfoForm(p => ({ ...p, discipline: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>难度</label>
                  <select value={infoForm.level} onChange={e => setInfoForm(p => ({ ...p, level: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}>
                    <option value="beginner">初级</option>
                    <option value="intermediate">中级</option>
                    <option value="advanced">高级</option>
                  </select>
                </div>
                {classData.class_type === 'private' && clientList.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>学员</label>
                    <select value={infoForm.assigned_to} onChange={e => setInfoForm(p => ({ ...p, assigned_to: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="">未分配</option>
                      {clientList.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>备注</label>
                <textarea value={infoForm.notes} onChange={e => setInfoForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button onClick={handleSaveInfo} disabled={savingInfo}
                  style={{ padding: '8px 20px', background: savingInfo ? 'var(--c-lavender)' : 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                  {savingInfo ? '保存中…' : '保存'}
                </button>
                <button onClick={() => setEditInfo(false)}
                  style={{ padding: '8px 16px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', background: 'var(--c-fill-light)', color: 'var(--c-text-secondary)' }}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <>
              {isTrainer && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                  <button onClick={openEditInfo}
                    style={{ fontSize: 'var(--text-xs)', color: 'var(--c-brand)', border: '1px solid var(--c-border-em)', borderRadius: 'var(--r-sm)', padding: '4px 12px', background: 'var(--c-fill-light)', cursor: 'pointer' }}>
                    ✏️ 编辑信息
                  </button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>日期 Date</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{new Date(classData.date + 'T12:00:00').toLocaleDateString('zh-CN')}</p>
                </div>
                {classData.start_time && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>时间 Time</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.start_time.slice(0, 5)}</p>
                  </div>
                )}
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>时长 Duration</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.duration} 分钟</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>类别 Discipline</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.discipline || classData.type || '—'}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>形式 Format</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.class_type === 'group' ? '👥 团课' : '🧘 私教'}</p>
                </div>
                {classData.level && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>难度 Level</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>
                      {{ beginner: '初级', intermediate: '中级', advanced: '高级' }[classData.level] || classData.level}
                    </p>
                  </div>
                )}
                {classData.price != null && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>价格 Price</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>¥{classData.price}</p>
                  </div>
                )}
                {classData.class_type === 'group' && classData.max_capacity && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>人数上限</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.max_capacity} 人</p>
                  </div>
                )}
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--c-text-hint)', fontSize: 'var(--text-xs)' }}>状态</p>
                  {(() => { const cfg = STATUS_CONFIG[classData.status] || STATUS_CONFIG.planned; return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: cfg.bg, color: cfg.color, border: cfg.border, borderRadius: 'var(--r-full)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                      {cfg.dot} {cfg.label}
                    </span>
                  ) })()}
                </div>
              </div>

              {classData.description && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                  <p style={{ margin: '0 0 6px 0', color: '#999', fontSize: '11px' }}>课程介绍 Description</p>
                  <p style={{ margin: 0, color: '#444', lineHeight: '1.6' }}>{classData.description}</p>
                </div>
              )}

              {classData.notes && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>备注 Notes</p>
                  <p style={{ margin: 0, color: '#444' }}>{classData.notes}</p>
                </div>
              )}

              {classData.post_summary && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>课后总结 Post Summary</p>
                  <p style={{ margin: 0, color: '#444' }}>{classData.post_summary}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Assigned client card — shown to trainers on private classes */}
        {isTrainer && assignedClient && classData.class_type === 'private' && (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '8px', padding: '16px', marginBottom: '16px', borderLeft: '4px solid var(--c-brand)' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: (assignedClient.injury_notes || assignedClient.goals || assignedClient.bio) ? '14px' : '0' }}>
              {assignedClient.photo_url ? (
                <img src={assignedClient.photo_url} alt={assignedClient.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--c-fill-light)', border: '2px solid var(--c-pink-mist)', color: 'var(--c-brand)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600 }}>
                  {assignedClient.name?.[0] || '?'}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '15px' }}>👤 {assignedClient.name || assignedClient.email}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{assignedClient.email}</p>
              </div>
              <Link href={`/dashboard/clients/${assignedClient.id}`} style={{ fontSize: '12px', color: 'var(--c-brand)', textDecoration: 'none', flexShrink: 0 }}>
                学员档案 →
              </Link>
            </div>

            {(assignedClient.injury_notes || assignedClient.goals || assignedClient.bio) && (
              <div style={{ display: 'grid', gridTemplateColumns: assignedClient.injury_notes && assignedClient.goals ? '1fr 1fr' : '1fr', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                {assignedClient.injury_notes && (
                  <div style={{ backgroundColor: '#fff8f0', borderRadius: '6px', padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#E8763A', fontWeight: 'bold' }}>⚠️ 伤病 / 体态问题</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{assignedClient.injury_notes}</p>
                  </div>
                )}
                {assignedClient.goals && (
                  <div style={{ backgroundColor: '#f0f9f4', borderRadius: '6px', padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#2E8B57', fontWeight: 'bold' }}>🎯 训练目标</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{assignedClient.goals}</p>
                  </div>
                )}
                {!assignedClient.injury_notes && !assignedClient.goals && assignedClient.bio && (
                  <div style={{ backgroundColor: '#f8f6fb', borderRadius: '6px', padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--c-brand)', fontWeight: 'bold' }}>📝 备注</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: '1.6' }}>{assignedClient.bio}</p>
                  </div>
                )}
              </div>
            )}

            {!assignedClient.injury_notes && !assignedClient.goals && !assignedClient.bio && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
                <Link href={`/dashboard/clients/${assignedClient.id}`} style={{ fontSize: '12px', color: '#bbb', textDecoration: 'none' }}>
                  + 添加学员体测备注和训练目标
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Trainer card */}
        {trainerInfo && (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            {trainerInfo.photo_url ? (
              <img src={trainerInfo.photo_url} alt={trainerInfo.name}
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--c-fill-light)', border: '2px solid var(--c-pink-mist)', color: 'var(--c-brand)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600 }}>
                {trainerInfo.name?.[0] || '?'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '15px' }}>{trainerInfo.name}</p>
              {trainerInfo.certificate && <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--c-brand)' }}>🏆 {trainerInfo.certificate}</p>}
              {trainerInfo.bio && <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#666', lineHeight: '1.5' }}>{trainerInfo.bio.length > 100 ? trainerInfo.bio.slice(0, 100) + '...' : trainerInfo.bio}</p>}
              <Link href={`/dashboard/trainers/${trainerInfo.id}`} style={{ fontSize: '12px', color: 'var(--c-brand)', textDecoration: 'none' }}>查看教练主页 →</Link>
            </div>
          </div>
        )}

        {/* Photos gallery */}
        {classPhotos.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {classPhotos.map((url, i) => (
                <img key={i} src={url} alt={`photo ${i + 1}`}
                  style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              ))}
            </div>
          </div>
        )}

        {/* Group class student roster */}
        {isTrainer && isGroupClass && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: enrollments.length > 0 ? '12px' : '0' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--c-text-primary)' }}>
                👥 学员名单 <span style={{ fontWeight: 'normal', color: 'var(--c-text-hint)', fontSize: '13px' }}>({enrollments.length} 人)</span>
              </span>
              <button
                onClick={() => { setShowAddEnrollment(v => !v); fetchClients(); setEnrollmentSearch('') }}
                style={{ padding: '5px 14px', background: showAddEnrollment ? 'var(--c-fill-light)' : 'var(--c-brand)', color: showAddEnrollment ? 'var(--c-text-secondary)' : 'white', border: showAddEnrollment ? '1px solid var(--c-border)' : 'none', borderRadius: 'var(--r-sm)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {showAddEnrollment ? '取消' : '+ 添加学员'}
              </button>
            </div>

            {/* Enrolled students list */}
            {enrollments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: showAddEnrollment ? '12px' : '0' }}>
                {enrollments.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px 5px 6px', background: 'var(--c-fill-light)', borderRadius: '20px', border: '1px solid var(--c-border)' }}>
                    {e.student.photo_url ? (
                      <img src={e.student.photo_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--c-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                        {(e.student.name || e.student.email)?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: '13px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{e.student.name || e.student.email}</span>
                    <button
                      onClick={() => handleRemoveEnrollment(e.student.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-hint)', fontSize: '14px', lineHeight: 1, padding: '0 0 0 2px' }}
                      title="移除">✕</button>
                  </div>
                ))}
              </div>
            )}

            {enrollments.length === 0 && !showAddEnrollment && (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--c-text-hint)' }}>暂无学员，点「+ 添加学员」添加</p>
            )}

            {/* Add student search */}
            {showAddEnrollment && (
              <div>
                <input
                  type="text"
                  placeholder="搜索学员姓名或邮箱…"
                  value={enrollmentSearch}
                  onChange={e => setEnrollmentSearch(e.target.value)}
                  autoFocus
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }}
                />
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {clientList
                    .filter(c => {
                      const enrolled = enrollments.some(e => e.student.id === c.id)
                      if (enrolled) return false
                      if (!enrollmentSearch) return true
                      const q = enrollmentSearch.toLowerCase()
                      return (c.name || '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
                    })
                    .map(c => (
                      <div key={c.id}
                        onClick={() => handleAddEnrollment(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-fill-light)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                          {(c.name || c.email)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--c-text-primary)' }}>{c.name || c.email}</p>
                          {c.name && <p style={{ margin: 0, fontSize: '11px', color: 'var(--c-text-hint)' }}>{c.email}</p>}
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--c-brand)', fontWeight: 500 }}>+ 添加</span>
                      </div>
                    ))
                  }
                  {clientList.filter(c => !enrollments.some(e => e.student.id === c.id)).length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', fontSize: '13px', padding: '16px 0', margin: 0 }}>所有学员都已在名单中</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs (group class trainer view shows student notes tab) */}
        {isTrainer && isGroupClass && (
          <div style={{ display: 'flex', gap: '2px', marginBottom: '0', borderBottom: '2px solid #eee' }}>
            {(['exercises', 'distributed', 'student-notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  color: activeTab === tab ? 'var(--c-brand)' : '#666',
                  borderBottom: activeTab === tab ? '2px solid var(--c-brand)' : '2px solid transparent',
                  marginBottom: '-2px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab === 'exercises' ? `动作 (${classData.exercises.length})`
                  : tab === 'distributed' ? `学员记录 (${distributedHomework.length})`
                  : `学员笔记 (${studentNotes.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Exercise List */}
        {activeTab === 'exercises' && (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: isTrainer && isGroupClass ? '0 0 10px 10px' : '10px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#444', fontSize: '14px' }}>
                {t('动作列表', 'Exercises')}
                {classData.exercises.length > 0 && <span style={{ color: '#bbb', fontWeight: 'normal', marginLeft: '6px' }}>({classData.exercises.length})</span>}
                {reordering && <span style={{ color: 'var(--c-brand)', fontWeight: 'normal', fontSize: '11px', marginLeft: '8px' }}>保存顺序…</span>}
                {isTrainer && classData.exercises.length > 1 && !reordering && <span style={{ color: '#bbb', fontWeight: 'normal', fontSize: '11px', marginLeft: '8px' }}>拖动 ⠿ 排序</span>}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isTrainer && hasUnsaved && (
                  <button
                    onClick={saveAll}
                    style={{ padding: '5px 14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                    💾 {t('保存', 'Save')}
                  </button>
                )}
              {isTrainer && classData.exercises.length > 0 && (
                <>
                  {isGroupClass ? (
                    <button onClick={() => { setShowDistribute(true); fetchClients() }}
                      style={{ padding: '5px 12px', background: 'var(--c-brand)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                      📤 {t('分发给学员', 'Distribute')}
                    </button>
                  ) : (
                    <button onClick={() => {
                        setShowHomework(true)
                        fetchClients()
                        if (classData?.assigned_to) setHomeworkStudentId(classData.assigned_to)
                      }}
                      style={{ padding: '5px 12px', background: 'var(--c-brand)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                      📋 {t('布置作业', 'Assign HW')}
                    </button>
                  )}
                </>
              )}
              </div>
            </div>

            {/* Exercise rows — 2-row card layout */}
            {classData.exercises.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 'var(--text-sm)' }}>
                {t('暂无动作，在下方搜索添加', 'No exercises yet. Search below to add.')}
              </div>
            ) : (
              classData.exercises.map((ex, i) => {
                const p = getLocal(ex)
                const isSaving = savingIds.has(ex.id)
                const inputBase: React.CSSProperties = {
                  padding: '6px 6px',
                  border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 'var(--text-sm)',
                  textAlign: 'center' as const,
                  boxSizing: 'border-box' as const,
                  background: isTrainer ? 'var(--c-card-bg)' : 'var(--c-fill-light)',
                  color: 'var(--c-text-primary)',
                  width: '100%',
                }
                const isDragging = draggedId === ex.id
                const isDragOver = dragOverId === ex.id
                return (
                  <div key={ex.id}
                    data-exercise-id={ex.id}
                    onDragOver={e => handleDragOver(e, ex.id)}
                    onDrop={() => handleDrop(ex.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      padding: '10px 14px',
                      borderBottom: i < classData.exercises.length - 1 ? '1px solid var(--c-border)' : 'none',
                      background: isDragOver ? 'var(--c-fill-mid)' : isSaving ? 'var(--c-fill-light)' : 'var(--c-card-bg)',
                      opacity: isDragging ? 0.4 : 1,
                      cursor: isTrainer ? 'grab' : 'default',
                      transition: 'background 0.1s, opacity 0.15s',
                    }}>
                    {/* Row 1: Drag handle + Number + Name + Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {isTrainer && (
                        <span
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(ex.id) }}
                          onTouchStart={(e) => { e.stopPropagation(); setDraggedId(ex.id) }}
                          style={{ color: 'var(--c-text-hint)', fontSize: '20px', cursor: 'grab', flexShrink: 0, userSelect: 'none', lineHeight: 1, padding: '8px 12px', touchAction: 'none' }}
                          title="拖动排序"
                        >⠿</span>
                      )}
                      <div style={{ width: 22, height: 22, background: 'var(--c-lavender)', color: 'var(--c-text-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--c-text-primary)' }}>
                          {lang === 'zh' ? (ex.master_exercise.name_cn || ex.master_exercise.name_en) : (ex.master_exercise.name_en || ex.master_exercise.name_cn)}
                        </p>
                        {(ex.actual_sets != null || ex.actual_weight != null) && (
                          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-brand)' }}>
                            ✓ {[ex.actual_sets && `${ex.actual_sets}${t('组','sets')}`, ex.actual_reps && `×${ex.actual_reps}`, ex.actual_weight && `${ex.actual_weight}kg`].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                      {isTrainer ? (
                        <button onClick={() => handleRemoveExercise(ex.id)}
                          style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--c-error-bg)', border: '1px solid var(--c-error)', color: 'var(--c-error)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          ✕
                        </button>
                      ) : null}
                    </div>

                    {/* Row 2: Sets | Reps | Weight | Notes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 3fr', gap: '6px', alignItems: 'end' }}>
                      {/* Sets */}
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--c-text-hint)', marginBottom: '3px', textAlign: 'center' }}>{t('组', 'Sets')}</div>
                        <input type="number" min="0" max="99" value={p.sets}
                          disabled={!isTrainer}
                          onChange={e => updateLocal(ex.id, 'sets', e.target.value)}
                          onBlur={() => saveField(ex, 'sets')}
                          style={inputBase}
                        />
                      </div>
                      {/* Reps */}
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--c-text-hint)', marginBottom: '3px', textAlign: 'center' }}>{t('次', 'Reps')}</div>
                        <input type="number" min="0" max="999" value={p.reps}
                          disabled={!isTrainer}
                          onChange={e => updateLocal(ex.id, 'reps', e.target.value)}
                          onBlur={() => saveField(ex, 'reps')}
                          style={inputBase}
                        />
                      </div>
                      {/* Weight + unit */}
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--c-text-hint)', marginBottom: '3px', textAlign: 'center' }}>{t('配重', 'Weight')}</div>
                        <div style={{ display: 'flex' }}>
                          <input type="number" min="0" step="0.5" value={p.weight}
                            disabled={!isTrainer}
                            onChange={e => updateLocal(ex.id, 'weight', e.target.value)}
                            onBlur={() => saveField(ex, 'weight')}
                            style={{ ...inputBase, borderRadius: 'var(--r-sm) 0 0 var(--r-sm)', flex: 1 }}
                          />
                          <select value={p.weight_unit} disabled={!isTrainer}
                            onChange={e => { updateLocal(ex.id, 'weight_unit', e.target.value) }}
                            onBlur={() => saveField(ex, 'weight_unit')}
                            style={{ padding: '6px 4px', border: '1px solid var(--c-border)', borderLeft: 'none', borderRadius: '0 var(--r-sm) var(--r-sm) 0', fontSize: '11px', background: 'var(--c-fill-light)', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>
                            <option value="kg">kg</option>
                            <option value="lb">lb</option>
                          </select>
                        </div>
                      </div>
                      {/* Notes */}
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--c-text-hint)', marginBottom: '3px' }}>{t('备注', 'Notes')}</div>
                        <input type="text" value={p.instance_notes}
                          disabled={!isTrainer}
                          onChange={e => updateLocal(ex.id, 'instance_notes', e.target.value)}
                          onBlur={() => saveField(ex, 'instance_notes')}
                          placeholder={t('选填…', 'Optional…')}
                          style={{ ...inputBase, textAlign: 'left' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Inline exercise library (trainer only) */}
            {isTrainer && (() => {
              const alreadyAdded = new Set(classData.exercises.map(e => e.exercise_id))
              const allTypes = [...new Set(availableExercises.map(e => e.type_en).filter(Boolean))].sort() as string[]
              const allDiffs = [...new Set(availableExercises.map(e => e.difficulty_en).filter(Boolean))].sort() as string[]
              const allMuscles = [...new Set(
                availableExercises.flatMap(e => (e.target_muscles_en || '').split(',').map((m: string) => m.trim())).filter(Boolean)
              )].sort() as string[]
              const allSeries = [...new Set(availableExercises.map(e => e.series_cn || e.series_en).filter(Boolean))].sort() as string[]

              const libResults = availableExercises.filter(ex => {
                if (libFilterType && ex.type_en !== libFilterType) return false
                if (libFilterDiff && ex.difficulty_en !== libFilterDiff) return false
                if (libFilterMuscle && !(ex.target_muscles_en || '').split(',').map((m: string) => m.trim()).includes(libFilterMuscle)) return false
                if (libFilterSeries && (ex.series_cn || ex.series_en) !== libFilterSeries) return false
                if (libSearch) {
                  const q = libSearch.toLowerCase()
                  return (
                    (ex.name_cn || '').includes(libSearch) ||
                    (ex.name_en || '').toLowerCase().includes(q) ||
                    (ex.target_muscles_cn || '').includes(libSearch) ||
                    (ex.target_muscles_en || '').toLowerCase().includes(q)
                  )
                }
                return true
              })

              const activeFilterCount = [libFilterType, libFilterDiff, libFilterMuscle, libFilterSeries].filter(Boolean).length

              return (
                <div style={{ borderTop: '2px dashed #e8dff5', backgroundColor: '#faf8fd', borderRadius: '0 0 8px 8px' }}>
                  {/* Search + filters */}
                  <div style={{ padding: '10px 14px 8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder={t('搜索动作名称、肌肉...', 'Search name, muscles...')}
                        value={libSearch}
                        onChange={e => setLibSearch(e.target.value)}
                        style={{ flex: 1, padding: '7px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', background: 'var(--c-card-bg)' }}
                      />
                      <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>{libResults.length} {t('个', '')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                      <select value={libFilterType} onChange={e => setLibFilterType(e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${libFilterType ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: libFilterType ? '#f0eaf8' : 'white', color: libFilterType ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                        <option value="">{t('全部分类', 'All types')}</option>
                        {allTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                      </select>
                      <select value={libFilterDiff} onChange={e => setLibFilterDiff(e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${libFilterDiff ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: libFilterDiff ? '#f0eaf8' : 'white', color: libFilterDiff ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                        <option value="">{t('全部难度', 'All levels')}</option>
                        {allDiffs.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={libFilterMuscle} onChange={e => setLibFilterMuscle(e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${libFilterMuscle ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: libFilterMuscle ? '#f0eaf8' : 'white', color: libFilterMuscle ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                        <option value="">{t('全部肌肉', 'All muscles')}</option>
                        {allMuscles.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      {allSeries.length > 0 && (
                        <select value={libFilterSeries} onChange={e => setLibFilterSeries(e.target.value)}
                          style={{ padding: '5px 8px', border: `1px solid ${libFilterSeries ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: libFilterSeries ? '#f0eaf8' : 'white', color: libFilterSeries ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                          <option value="">{t('全部系列', 'All series')}</option>
                          {allSeries.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                      {activeFilterCount > 0 && (
                        <button onClick={() => { setLibFilterType(''); setLibFilterDiff(''); setLibFilterMuscle(''); setLibFilterSeries('') }}
                          style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '16px', fontSize: '11px', background: 'var(--c-card-bg)', color: '#999', cursor: 'pointer', flexShrink: 0 }}>
                          {t('清除', 'Clear')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Results list */}
                  <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '0 14px 10px' }}>
                    {libResults.length === 0 && (
                      <p style={{ textAlign: 'center', color: '#bbb', padding: '20px 0', fontSize: '13px', margin: 0 }}>{t('没有匹配动作', 'No matches')}</p>
                    )}
                    {libResults.map(ex => {
                      const added = alreadyAdded.has(ex.id)
                      return (
                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '600', color: added ? '#bbb' : '#333' }}>
                              {lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)}
                            </p>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {ex.type_cn && <span style={{ fontSize: '10px', color: 'var(--c-brand)', background: 'var(--c-fill-light)', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.type_cn : ex.type_en}</span>}
                              {ex.difficulty_cn && <span style={{ fontSize: '10px', color: '#888', background: 'var(--c-page-bg)', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.difficulty_cn : ex.difficulty_en}</span>}
                              {ex.target_muscles_cn && <span style={{ fontSize: '10px', color: '#aaa' }}>{lang === 'zh' ? ex.target_muscles_cn : ex.target_muscles_en}</span>}
                            </div>
                          </div>
                          {(ex.default_sets || ex.default_reps) && (
                            <span style={{ fontSize: '11px', color: '#bbb', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {[ex.default_sets && `${ex.default_sets}×`, ex.default_reps].filter(Boolean).join('')}
                            </span>
                          )}
                          {added ? (
                            <span style={{ fontSize: '11px', color: '#bbb', flexShrink: 0 }}>✓</span>
                          ) : (
                            <button onClick={() => handleAddExercise(ex.id)} disabled={adding}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--c-brand)', color: 'white', cursor: adding ? 'wait' : 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>
                              +
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Distributed Records Tab */}
        {activeTab === 'distributed' && (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
            {loadingDistributed ? (
              <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', padding: '32px 0' }}>加载中…</p>
            ) : distributedHomework.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-text-hint)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '15px' }}>还没有分发记录</p>
                <p style={{ margin: 0, fontSize: '13px' }}>点「📤 分发给学员」发送计划</p>
              </div>
            ) : (
              distributedHomework.map((hw: any) => {
                const hasAnyNote = hw.homework_exercise?.some((e: any) => e.client_note)
                return (
                  <div key={hw.id} style={{ borderBottom: '1px solid var(--c-border)', padding: '16px 20px' }}>
                    {/* Client header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasAnyNote ? '12px' : 0 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--c-text-primary)' }}>
                          {hw.student?.name || hw.student?.email || '学员'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--c-text-secondary)' }}>
                          {hw.homework_exercise?.length || 0} 个动作
                          {hw.due_date && ` · 截止 ${new Date(hw.due_date + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '12px', padding: '3px 8px', borderRadius: '20px',
                        background: hasAnyNote ? 'var(--c-lavender)' : 'var(--c-fill-light)',
                        color: hasAnyNote ? 'var(--c-brand)' : 'var(--c-text-hint)',
                      }}>
                        {hasAnyNote ? '已写备注' : '暂无备注'}
                      </span>
                    </div>

                    {/* Exercise notes (only show if any client_note exists) */}
                    {hasAnyNote && hw.homework_exercise
                      ?.filter((e: any) => e.client_note)
                      .sort((a: any, b: any) => a.order_num - b.order_num)
                      .map((ex: any) => (
                        <div key={ex.id} style={{ display: 'flex', gap: '10px', marginBottom: '8px', paddingLeft: '8px' }}>
                          <div style={{ width: 3, borderRadius: 2, background: 'var(--c-brand)', flexShrink: 0 }} />
                          <div>
                            <p style={{ margin: '0 0 2px', fontSize: '12px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>
                              {lang === 'zh' ? (ex.master_exercise?.name_cn || ex.master_exercise?.name_en) : (ex.master_exercise?.name_en || ex.master_exercise?.name_cn)}
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--c-text-primary)' }}>{ex.client_note}</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )
              })
            )}
          </div>
        )}

                {/* Student Notes Tab (trainer view of group class) */}
        {activeTab === 'student-notes' && (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '0 0 8px 8px', padding: '20px' }}>
            {studentNotes.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>暂无学员笔记</p>
            ) : (
              studentNotes.map((note) => {
                const exercise = classData.exercises.find((e) => e.id === note.exercise_instance_id)
                return (
                  <div key={note.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '12px', marginBottom: '12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#999' }}>
                      {note.student_name || '学员'} · {exercise ? `${exercise.master_exercise.name_en}` : '动作'} ·{' '}
                      {new Date(note.created_at).toLocaleString('zh-CN')}
                    </p>
                    <p style={{ margin: 0, color: '#333' }}>{note.content}</p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* Homework Modal */}
      {showHomework && classData && (() => {
        const totalSelected = homeworkSelected.size + hwExtraSelected.size
        const alreadyInClass = new Set(classData.exercises.map(e => e.exercise_id))

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'var(--c-card-bg)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '17px' }}>📋 {t('布置课后作业', 'Assign Homework')}</h2>
                <button onClick={() => { setShowHomework(false); setHwExtraSearch(''); setHwExtraSelected(new Set()) }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

                {/* Student dropdown */}
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '16px' }}>
                  {t('分配给学员', 'Assign to student')}
                  <select value={homeworkStudentId} onChange={e => setHomeworkStudentId(e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--c-card-bg)' }}>
                    <option value="">{t('选择学员...', 'Select student...')}</option>
                    {clientList.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </label>

                {/* Class exercises selection */}
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#888', fontWeight: '600' }}>{t('本课动作', 'Class exercises')}</p>
                <div style={{ backgroundColor: '#f9f6fc', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                  {classData.exercises.length === 0 && (
                    <p style={{ margin: 0, padding: '16px', fontSize: '13px', color: '#bbb', textAlign: 'center' }}>{t('本课暂无动作', 'No exercises in this class')}</p>
                  )}
                  {classData.exercises.map((ex, i) => {
                    const selected = homeworkSelected.has(ex.id)
                    return (
                      <div key={ex.id}
                        onClick={() => {
                          setHomeworkSelected(prev => {
                            const next = new Set(prev)
                            next.has(ex.id) ? next.delete(ex.id) : next.add(ex.id)
                            return next
                          })
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: i < classData.exercises.length - 1 ? '1px solid #eee' : 'none', backgroundColor: selected ? '#f0eaf8' : 'white' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${selected ? 'var(--c-brand)' : '#ddd'}`, backgroundColor: selected ? 'var(--c-brand)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '14px' }}>{ex.master_exercise.name_cn || ex.master_exercise.name_en}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                            {[ex.sets && `${ex.sets}组`, ex.reps && `${ex.reps}次`, ex.weight && `${ex.weight}${ex.weight_unit}`].filter(Boolean).join(' · ') || t('未设置参数', 'No params')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Extra exercises from library */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888', fontWeight: '600' }}>{t('额外添加动作', 'Add extra exercises')}</p>
                  <button
                    onClick={() => setShowHwLibrary(true)}
                    style={{ padding: '6px 14px', backgroundColor: 'var(--c-brand)', color: 'white', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + {t('从动作库选', 'Browse library')}
                  </button>
                </div>
                {hwExtraSelected.size > 0 ? (
                  <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Array.from(hwExtraSelected).map(id => {
                      const ex = availableExercises.find(e => e.id === id)
                      if (!ex) return null
                      return (
                        <span key={id} style={{ padding: '4px 10px', background: 'var(--c-fill-light)', borderRadius: '12px', fontSize: '12px', color: 'var(--c-brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)}
                          <button onClick={() => setHwExtraSelected(prev => { const n = new Set(prev); n.delete(id); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-brand)', fontSize: '12px', padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#bbb' }}>{t('未选择额外动作', 'No extra exercises selected')}</p>
                )}

                {/* Due date + notes */}
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label style={{ fontSize: '13px', color: '#666' }}>
                    {t('截止日期（选填）', 'Due date (optional)')}
                    <input type="date" value={homeworkDueDate} onChange={e => setHomeworkDueDate(e.target.value)}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </label>
                  <label style={{ fontSize: '13px', color: '#666' }}>
                    {t('备注（选填）', 'Notes (optional)')}
                    <textarea value={homeworkNotes} onChange={e => setHomeworkNotes(e.target.value)}
                      placeholder={t('给学员的提示或说明...', 'Instructions for the student...')}
                      rows={2}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }} />
                  </label>
                </div>
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowHomework(false); setHwExtraSelected(new Set()) }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}>{t('取消', 'Cancel')}</button>
                <button
                  onClick={handleCreateHomework}
                  disabled={totalSelected === 0 || !homeworkStudentId || homeworkSubmitting}
                  style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--c-brand)', color: 'white', cursor: totalSelected > 0 && homeworkStudentId ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '14px', opacity: totalSelected > 0 && homeworkStudentId ? 1 : 0.5 }}>
                  {homeworkSubmitting ? t('布置中...', 'Saving...') : `${t('布置作业', 'Assign')}（${totalSelected} ${t('个动作', 'exercises')}）`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Distribute to Group Clients Modal */}
      {showDistribute && classData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: '0 0 2px 0', fontSize: '17px' }}>📤 {t('分发团课计划', 'Distribute Group Plan')}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--c-text-secondary)' }}>{t('选择要发送的学员', 'Select clients to send to')}</p>
              </div>
              <button onClick={() => { setShowDistribute(false); setDistributeSelected(new Set()) }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--c-text-secondary)', padding: '4px 8px' }}>✕</button>
            </div>

            {/* Client list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              {clientList.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', padding: '24px 0' }}>{t('没有学员', 'No clients found')}</p>
              ) : (
                <>
                  {/* Select all */}
                  <div
                    onClick={() => {
                      if (distributeSelected.size === clientList.length) {
                        setDistributeSelected(new Set())
                      } else {
                        setDistributeSelected(new Set(clientList.map(c => c.id)))
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--c-border)', marginBottom: '4px', cursor: 'pointer' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '4px', border: '2px solid var(--c-brand)', background: distributeSelected.size === clientList.length ? 'var(--c-brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {distributeSelected.size === clientList.length && <span style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{t('全选', 'Select all')} ({clientList.length})</span>
                  </div>

                  {clientList.map(c => {
                    const checked = distributeSelected.has(c.id)
                    return (
                      <div key={c.id}
                        onClick={() => {
                          const next = new Set(distributeSelected)
                          checked ? next.delete(c.id) : next.add(c.id)
                          setDistributeSelected(next)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--c-fill-light)', cursor: 'pointer' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '4px', border: `2px solid ${checked ? 'var(--c-brand)' : 'var(--c-border)'}`, background: checked ? 'var(--c-brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {checked && <span style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--c-text-primary)' }}>{c.name || c.email}</p>
                          {c.name && <p style={{ margin: 0, fontSize: '12px', color: 'var(--c-text-secondary)' }}>{c.email}</p>}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--c-border)', display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button onClick={() => { setShowDistribute(false); setDistributeSelected(new Set()) }}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--c-border)', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>
                {t('取消', 'Cancel')}
              </button>
              <button onClick={handleDistribute} disabled={distributeSelected.size === 0 || distributing}
                style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--c-brand)', color: 'white', cursor: distributeSelected.size > 0 && !distributing ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '14px', opacity: distributeSelected.size > 0 && !distributing ? 1 : 0.5 }}>
                {distributing ? t('发送中…', 'Sending…') : `${t('分发给', 'Send to')} ${distributeSelected.size} ${t('位学员', 'clients')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Class Modal */}
      {showCopyModal && classData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 2px 0', fontSize: '17px' }}>📋 {t('复制课程计划', 'Copy Class Plan')}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>{t('确认动作列表，设置新课时间后发布', 'Confirm exercises, then set the date to publish')}</p>
              </div>
              <button onClick={() => setShowCopyModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              {/* Course name */}
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '16px' }}>
                {t('课程名称', 'Class Name')}
                <input
                  value={copyForm.name}
                  onChange={e => setCopyForm(p => ({ ...p, name: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </label>

              {/* Date (required) */}
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '16px' }}>
                <span>{t('上课日期', 'Date')} <span style={{ color: '#E74C3C' }}>*</span></span>
                <input
                  type="date"
                  value={copyForm.date}
                  onChange={e => setCopyForm(p => ({ ...p, date: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: `1px solid ${copyForm.date ? 'var(--c-border)' : 'var(--c-error)'}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                {!copyForm.date && <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--c-error)' }}>请选择日期</p>}
              </label>

              {/* Time */}
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '16px' }}>
                {t('开始时间', 'Start Time')}
                <input
                  type="time"
                  value={copyForm.start_time}
                  onChange={e => setCopyForm(p => ({ ...p, start_time: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </label>

              {/* Student (private class only) */}
              {classData.class_type === 'private' && (
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '16px' }}>
                  {t('分配学员', 'Assign Student')}
                  <select
                    value={copyForm.assigned_to}
                    onChange={e => setCopyForm(p => ({ ...p, assigned_to: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--c-card-bg)' }}
                  >
                    <option value="">{t('不指定学员', 'No student assigned')}</option>
                    {clientList.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Exercise list — editable (delete + reorder) */}
              <div style={{ marginBottom: '8px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#888', fontWeight: '600' }}>
                  {t('动作列表', 'Exercises')} ({copyExercises.length})
                  <span style={{ fontWeight: 'normal', color: '#bbb', marginLeft: '6px', fontSize: '12px' }}>{t('可删除或调整顺序', 'Remove or reorder')}</span>
                </p>
                <div style={{ backgroundColor: '#f9f6fc', borderRadius: '10px', overflow: 'hidden' }}>
                  {copyExercises.map((ex, i) => (
                    <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderBottom: i < copyExercises.length - 1 ? '1px solid #eee' : 'none' }}>
                      {/* Up/Down */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            if (i === 0) return
                            const arr = [...copyExercises]
                            ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
                            setCopyExercises(arr)
                          }}
                          disabled={i === 0}
                          style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#ddd' : '#999', fontSize: '12px', padding: '0', lineHeight: 1 }}>▲</button>
                        <button
                          onClick={() => {
                            if (i === copyExercises.length - 1) return
                            const arr = [...copyExercises]
                            ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
                            setCopyExercises(arr)
                          }}
                          disabled={i === copyExercises.length - 1}
                          style={{ background: 'none', border: 'none', cursor: i === copyExercises.length - 1 ? 'default' : 'pointer', color: i === copyExercises.length - 1 ? '#ddd' : '#999', fontSize: '12px', padding: '0', lineHeight: 1 }}>▼</button>
                      </div>
                      {/* Index badge */}
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--c-brand)', color: 'white', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      {/* Name + params */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lang === 'zh' ? (ex.master_exercise.name_cn || ex.master_exercise.name_en) : (ex.master_exercise.name_en || ex.master_exercise.name_cn)}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>
                          {[ex.sets && `${ex.sets}组`, ex.reps && `×${ex.reps}次`, ex.weight && `${ex.weight}${ex.weight_unit}`].filter(Boolean).join(' · ') || t('未设置参数', 'No params')}
                        </p>
                      </div>
                      {/* Delete */}
                      <button
                        onClick={() => setCopyExercises(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '16px', padding: '2px 4px', flexShrink: 0 }}
                        title={t('移除', 'Remove')}>✕</button>
                    </div>
                  ))}
                  {copyExercises.length === 0 && (
                    <p style={{ padding: '16px', textAlign: 'center', color: '#bbb', fontSize: '13px', margin: 0 }}>{t('所有动作已移除', 'All exercises removed')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCopyModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
                {t('取消', 'Cancel')}
              </button>
              <button
                onClick={handleCopyClass}
                disabled={!copyForm.date || copying}
                style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--c-brand)', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: !copyForm.date || copying ? 'not-allowed' : 'pointer', opacity: !copyForm.date || copying ? 0.5 : 1 }}>
                {copying ? t('创建中…', 'Creating…') : t('确认创建', 'Confirm & Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hw Library Sub-dialog */}
      {showHwLibrary && classData && (() => {
        const alreadyInClass = new Set(classData.exercises.map(e => e.exercise_id))
        const allTypes = [...new Set(availableExercises.map(e => e.type_en).filter(Boolean))].sort() as string[]
        const allDiffs = [...new Set(availableExercises.map(e => e.difficulty_en).filter(Boolean))].sort() as string[]
        const allMuscles = [...new Set(
          availableExercises.flatMap(e => (e.target_muscles_en || '').split(',').map((m: string) => m.trim())).filter(Boolean)
        )].sort() as string[]
        const allSeries = [...new Set(availableExercises.map(e => e.series_cn || e.series_en).filter(Boolean))].sort() as string[]

        const hwLibResults = availableExercises.filter(ex => {
          if (alreadyInClass.has(ex.id)) return false
          if (hwLibFilterType && ex.type_en !== hwLibFilterType) return false
          if (hwLibFilterDiff && ex.difficulty_en !== hwLibFilterDiff) return false
          if (hwLibFilterMuscle && !(ex.target_muscles_en || '').split(',').map((m: string) => m.trim()).includes(hwLibFilterMuscle)) return false
          if (hwLibFilterSeries && (ex.series_cn || ex.series_en) !== hwLibFilterSeries) return false
          if (hwLibSearch) {
            const q = hwLibSearch.toLowerCase()
            return (
              (ex.name_cn || '').includes(hwLibSearch) ||
              (ex.name_en || '').toLowerCase().includes(q) ||
              (ex.target_muscles_cn || '').includes(hwLibSearch) ||
              (ex.target_muscles_en || '').toLowerCase().includes(q)
            )
          }
          return true
        })

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'var(--c-card-bg)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '16px' }}>💪 {t('从动作库选择', 'Browse Exercise Library')}</h2>
                <button onClick={() => { setShowHwLibrary(false); setHwLibSearch(''); setHwLibFilterType(''); setHwLibFilterDiff(''); setHwLibFilterMuscle('') }}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
              </div>

              {/* Search + filters */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type="text"
                  placeholder={t('搜索动作名称、肌肉...', 'Search name, muscles...')}
                  value={hwLibSearch}
                  onChange={e => setHwLibSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  <select value={hwLibFilterType} onChange={e => setHwLibFilterType(e.target.value)}
                    style={{ padding: '5px 8px', border: `1px solid ${hwLibFilterType ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: hwLibFilterType ? '#f0eaf8' : 'white', color: hwLibFilterType ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="">{t('全部分类', 'All types')}</option>
                    {allTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                  <select value={hwLibFilterDiff} onChange={e => setHwLibFilterDiff(e.target.value)}
                    style={{ padding: '5px 8px', border: `1px solid ${hwLibFilterDiff ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: hwLibFilterDiff ? '#f0eaf8' : 'white', color: hwLibFilterDiff ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="">{t('全部难度', 'All levels')}</option>
                    {allDiffs.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={hwLibFilterMuscle} onChange={e => setHwLibFilterMuscle(e.target.value)}
                    style={{ padding: '5px 8px', border: `1px solid ${hwLibFilterMuscle ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: hwLibFilterMuscle ? '#f0eaf8' : 'white', color: hwLibFilterMuscle ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="">{t('全部肌肉', 'All muscles')}</option>
                    {allMuscles.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {allSeries.length > 0 && (
                    <select value={hwLibFilterSeries} onChange={e => setHwLibFilterSeries(e.target.value)}
                      style={{ padding: '5px 8px', border: `1px solid ${hwLibFilterSeries ? 'var(--c-brand)' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: hwLibFilterSeries ? '#f0eaf8' : 'white', color: hwLibFilterSeries ? 'var(--c-brand)' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                      <option value="">{t('全部系列', 'All series')}</option>
                      {allSeries.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {(hwLibFilterType || hwLibFilterDiff || hwLibFilterMuscle || hwLibFilterSeries) && (
                    <button onClick={() => { setHwLibFilterType(''); setHwLibFilterDiff(''); setHwLibFilterMuscle(''); setHwLibFilterSeries('') }}
                      style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '16px', fontSize: '11px', background: 'var(--c-card-bg)', color: '#999', cursor: 'pointer', flexShrink: 0 }}>
                      {t('清除', 'Clear')}
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                <p style={{ margin: '8px 0 4px 0', fontSize: '11px', color: '#bbb' }}>{hwLibResults.length} {t('个动作', 'exercises')}</p>
                {hwLibResults.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#bbb', padding: '30px 0', fontSize: '13px' }}>{t('没有匹配动作', 'No matches')}</p>
                )}
                {hwLibResults.map(ex => {
                  const sel = hwExtraSelected.has(ex.id)
                  return (
                    <div key={ex.id}
                      onClick={() => setHwExtraSelected(prev => { const n = new Set(prev); n.has(ex.id) ? n.delete(ex.id) : n.add(ex.id); return n })}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${sel ? 'var(--c-brand)' : '#ddd'}`, backgroundColor: sel ? 'var(--c-brand)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                          {lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)}
                        </p>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {ex.type_cn && <span style={{ fontSize: '10px', color: 'var(--c-brand)', background: 'var(--c-fill-light)', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.type_cn : ex.type_en}</span>}
                          {ex.difficulty_cn && <span style={{ fontSize: '10px', color: '#888', background: 'var(--c-page-bg)', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.difficulty_cn : ex.difficulty_en}</span>}
                          {ex.target_muscles_cn && <span style={{ fontSize: '10px', color: '#aaa' }}>{lang === 'zh' ? ex.target_muscles_cn : ex.target_muscles_en}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ flex: 1, fontSize: '13px', color: '#888' }}>
                  {hwExtraSelected.size > 0 ? `${t('已选', 'Selected')} ${hwExtraSelected.size} ${t('个', '')}` : t('点击动作选择', 'Tap to select')}
                </span>
                <button
                  onClick={() => { setShowHwLibrary(false); setHwLibSearch(''); setHwLibFilterType(''); setHwLibFilterDiff(''); setHwLibFilterMuscle('') }}
                  style={{ padding: '10px 24px', backgroundColor: 'var(--c-brand)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {t('确认', 'Done')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
