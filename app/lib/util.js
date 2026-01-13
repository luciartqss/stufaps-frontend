import dayjs from 'dayjs'

const countWorkingDays = (due, holidays = []) => {
  let start = dayjs(due).startOf('day')
  const end = dayjs().startOf('day')

  let count = 0

  while (start.isBefore(end)) {
    const day = start.day() // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 0 || day === 6
    const isHoliday = holidays.indexOf(start.format('YYYY-MM-DD')) !== -1

    if (!isWeekend && !isHoliday) {
      count++
    }

    start = start.add(1, 'day')
  }

  return count
}

const getWorkingDays = (receivedAt, days, holidays = []) => {
  let start = dayjs(receivedAt).startOf('day')

  const workingDays = []
  let count = 0

  while (count <= days) {
    const day = start.day() // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 0 || day === 6
    const isHoliday = holidays.indexOf(start.format('YYYY-MM-DD')) !== -1

    if (!isWeekend && !isHoliday) {
      count++
      workingDays.push(start.format('YYYY-MM-DD'))
    }

    start = start.add(1, 'day')
  }

  return workingDays
}

const countWorkingDaysFrom = (receivedAt, due, holidays = []) => {
  let start = dayjs(receivedAt).startOf('day')
  const end = dayjs(due).startOf('day')

  let count = 0

  while (start.isBefore(end)) {
    const day = start.day() // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 0 || day === 6
    const isHoliday = holidays.indexOf(start.format('YYYY-MM-DD')) !== -1

    if (!isWeekend && !isHoliday) {
      count++
    }

    start = start.add(1, 'day')
  }

  return count
}

const generateCoolBluePalette = (
  count,
  minHue = 180,
  maxHue = 240,
  saturation = 80,
  lightness = 55,
) => {
  const step = (maxHue - minHue) / Math.max(count - 1, 1)
  return Array.from({ length: count }, (_, i) => {
    const hue = minHue + step * i
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  })
}

const getInitials = str =>
  str
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

const convertNumberWithCommas = x => {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const removeHtmlTags = htmlString => {
  return htmlString.replace(/<[^>]*>/g, '').trim()
}

/**
 * Adjusts a number to the specified digit.
 *
 * @param {"round" | "floor" | "ceil"} type The type of adjustment.
 * @param {number} value The number.
 * @param {number} exp The exponent (the 10 logarithm of the adjustment base).
 * @returns {number} The adjusted value.
 */
const decimalAdjust = (type, value, exp) => {
  type = String(type)
  if (!['round', 'floor', 'ceil'].includes(type)) {
    throw new TypeError(
      "The type of decimal adjustment must be one of 'round', 'floor', or 'ceil'.",
    )
  }
  exp = Number(exp)
  value = Number(value)
  if (exp % 1 !== 0 || Number.isNaN(value)) {
    return NaN
  } else if (exp === 0) {
    return Math[type](value)
  }
  const [magnitude, exponent = 0] = value.toString().split('e')
  const adjustedValue = Math[type](`${magnitude}e${exponent - exp}`)
  // Shift back
  const [newMagnitude, newExponent = 0] = adjustedValue.toString().split('e')
  return Number(`${newMagnitude}e${Number(newExponent) + exp}`)
}

export {
  countWorkingDays,
  getWorkingDays,
  countWorkingDaysFrom,
  generateCoolBluePalette,
  getInitials,
  convertNumberWithCommas,
  makeId,
  removeHtmlTags,
  decimalAdjust,
}
