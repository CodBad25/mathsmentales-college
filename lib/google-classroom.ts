/**
 * Service Google Classroom API
 * Permet d'importer les classes depuis Google Classroom
 */

import { google } from 'googleapis'

const CLASSROOM_COLORS = [
  '#1967D2', '#1E8E3E', '#E8710A', '#D93025',
  '#9334E6', '#12B5CB', '#E52592', '#F9AB00'
]

function getCourseColor(courseId: string): string {
  let hash = 0
  for (let i = 0; i < courseId.length; i++) {
    hash = ((hash << 5) - hash) + courseId.charCodeAt(i)
    hash = hash & hash
  }
  return CLASSROOM_COLORS[Math.abs(hash) % CLASSROOM_COLORS.length]
}

function createOAuth2Client(accessToken: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  return oauth2Client
}

export interface GoogleClassroomCourse {
  id: string
  name: string
  section: string
  room: string
  ownerId: string
  courseState: string
  color: string
  studentCount?: number
}

export interface GoogleClassroomStudent {
  userId: string
  name: string
  email: string
  photoUrl: string
}

/**
 * Recupere les classes de l'enseignant depuis Google Classroom
 */
export async function listCourses(accessToken: string, refreshToken?: string): Promise<GoogleClassroomCourse[]> {
  try {
    const auth = createOAuth2Client(accessToken, refreshToken)
    const classroom = google.classroom({ version: 'v1', auth })

    const response = await classroom.courses.list({
      teacherId: 'me',
      courseStates: ['ACTIVE']
    })

    const courses = response.data.courses || []

    return courses.map(course => ({
      id: course.id || '',
      name: course.name || '',
      section: course.section || '',
      room: course.room || '',
      ownerId: course.ownerId || '',
      courseState: course.courseState || '',
      color: getCourseColor(course.id || '')
    }))
  } catch (error) {
    console.error('Erreur recuperation classes Google Classroom:', error)
    throw error
  }
}

/**
 * Recupere les eleves d'une classe Google Classroom
 */
export async function listStudents(
  accessToken: string,
  courseId: string,
  refreshToken?: string
): Promise<GoogleClassroomStudent[]> {
  try {
    const auth = createOAuth2Client(accessToken, refreshToken)
    const classroom = google.classroom({ version: 'v1', auth })

    const response = await classroom.courses.students.list({
      courseId: courseId
    })

    const students = response.data.students || []

    return students.map(student => ({
      userId: student.userId || '',
      name: student.profile?.name?.fullName || '',
      email: student.profile?.emailAddress || '',
      photoUrl: student.profile?.photoUrl || ''
    }))
  } catch (error) {
    console.error('Erreur recuperation eleves:', error)
    throw error
  }
}

/**
 * Rafraichit le token d'acces
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiryDate: number
}> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    return {
      accessToken: credentials.access_token || '',
      expiryDate: credentials.expiry_date || Date.now() + 3600000
    }
  } catch (error) {
    console.error('Erreur rafraichissement token:', error)
    throw error
  }
}

/**
 * Cree une annonce dans Google Classroom avec un lien
 */
export async function createAnnouncement(
  accessToken: string,
  courseId: string,
  text: string,
  linkUrl?: string,
  linkTitle?: string,
  refreshToken?: string
): Promise<any> {
  try {
    const auth = createOAuth2Client(accessToken, refreshToken)
    const classroom = google.classroom({ version: 'v1', auth })

    const announcementData: any = {
      text: text,
      state: 'PUBLISHED'
    }

    if (linkUrl) {
      announcementData.materials = [{
        link: {
          url: linkUrl,
          title: linkTitle || 'Lien'
        }
      }]
    }

    const response = await classroom.courses.announcements.create({
      courseId: courseId,
      requestBody: announcementData
    })

    return response.data
  } catch (error) {
    console.error('Erreur creation annonce:', error)
    throw error
  }
}

/**
 * Cree un devoir dans Google Classroom
 */
export async function createAssignment(
  accessToken: string,
  courseId: string,
  title: string,
  description: string,
  linkUrl: string,
  dueDate?: { year: number; month: number; day: number },
  dueTime?: { hours: number; minutes: number },
  refreshToken?: string
): Promise<any> {
  try {
    const auth = createOAuth2Client(accessToken, refreshToken)
    const classroom = google.classroom({ version: 'v1', auth })

    const coursework: any = {
      title: title,
      description: description,
      state: 'PUBLISHED',
      workType: 'ASSIGNMENT',
      materials: [{
        link: {
          url: linkUrl,
          title: title
        }
      }]
    }

    if (dueDate) {
      coursework.dueDate = dueDate
    }

    if (dueTime) {
      coursework.dueTime = dueTime
    }

    const response = await classroom.courses.courseWork.create({
      courseId: courseId,
      requestBody: coursework
    })

    return response.data
  } catch (error) {
    console.error('Erreur creation devoir:', error)
    throw error
  }
}
