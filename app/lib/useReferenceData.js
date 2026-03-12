import { useState, useEffect, useMemo, useRef } from 'react'

/**
 * Singleton cache — shared across all hook instances so data is only fetched once.
 * Each key maps to { data, promise } where promise is the in-flight fetch.
 */
const cache = {}

async function loadJson(url) {
  if (cache[url]?.data) return cache[url].data
  if (cache[url]?.promise) return cache[url].promise

  const promise = fetch(url)
    .then(r => { if (!r.ok) throw new Error(`Failed to load ${url}`); return r.json() })
    .then(data => { cache[url] = { data, promise: null }; return data })
    .catch(err => { cache[url] = null; throw err })

  cache[url] = { data: null, promise }
  return promise
}

// ─── Sorted, de-duped utility ──────────────────────────────────────────
const uniqSort = (arr) => [...new Set(arr)].filter(Boolean).sort((a, b) => a.localeCompare(b))

// Normalize UII by stripping leading zeros so '04245' and '4245' match
const normalizeUii = (uii) => String(uii || '').trim().replace(/^0+/, '') || '0'

// ─── Hook ──────────────────────────────────────────────────────────────
export function useReferenceData(editMode) {
  const [heiRaw, setHeiRaw] = useState(null)
  const [programsRaw, setProgramsRaw] = useState(null)
  const [priorityRaw, setPriorityRaw] = useState(null)
  const [psgcRaw, setPsgcRaw] = useState(null)
  const [zipManila, setZipManila] = useState(null)
  const [zipProvincial, setZipProvincial] = useState(null)
  const loaded = useRef(false)

  // Only fetch when edit mode is activated for the first time
  useEffect(() => {
    if (!editMode || loaded.current) return
    loaded.current = true

    Promise.all([
      loadJson('/data/HEI.json').then(setHeiRaw).catch(() => {}),
      loadJson('/data/List_of_Program_Offerings.json').then(setProgramsRaw).catch(() => {}),
      loadJson('/data/Priority_Code.json').then(setPriorityRaw).catch(() => {}),
      loadJson('/data/PSGC.json').then(setPsgcRaw).catch(() => {}),
      loadJson('/data/Zip_Code_Manila.json').then(setZipManila).catch(() => {}),
      loadJson('/data/Zip_Code_Provincial.json').then(setZipProvincial).catch(() => {}),
    ])
  }, [editMode])

  // ── HEI institutions (alphabetical) ──
  const institutions = useMemo(() => {
    if (!heiRaw) return []
    return heiRaw
      .map(h => ({
        uii: normalizeUii(h.UII),
        name: (h['Name of Institution'] || '').trim(),
      }))
      .filter(h => h.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [heiRaw])

  // Map UII → institution name for quick lookup
  const heiByUii = useMemo(() => {
    const m = new Map()
    institutions.forEach(h => m.set(normalizeUii(h.uii), h))
    return m
  }, [institutions])

  // ── Program offerings indexed by UII ──
  const programsByUii = useMemo(() => {
    if (!programsRaw) return new Map()
    const m = new Map()
    programsRaw.forEach(p => {
      const uii = normalizeUii(p.UII)
      if (!uii || uii === '0') return
      if (!m.has(uii)) m.set(uii, [])
      m.get(uii).push({
        institutionName: (p['Name of Higher Education Institution'] || '').trim(),
        institutionalType: (p['Institutional Type'] || '').trim(),
        program: (p.Program || '').trim(),
        major: (p['Major / Specialization'] || '').trim(),
        authorityType: (p.GPR || '').trim(),
        authorityNumber: (p['GP/GR No.'] || '').trim(),
        series: (p.Series || '').trim(),
      })
    })
    return m
  }, [programsRaw])

  // Get programs for a given UII (alphabetical)
  const getProgramsForUii = (uii) => {
    if (!uii) return []
    const entries = programsByUii.get(normalizeUii(uii)) || []
    // Unique program names, sorted
    const seen = new Set()
    return entries
      .filter(e => { if (!e.program || seen.has(e.program)) return false; seen.add(e.program); return true })
      .sort((a, b) => a.program.localeCompare(b.program))
  }

  // Get majors for a given UII + program (alphabetical)
  const getMajorsForProgram = (uii, program) => {
    if (!uii || !program) return []
    const entries = (programsByUii.get(normalizeUii(uii)) || [])
      .filter(e => e.program === program && e.major && e.major !== '-')
    return uniqSort(entries.map(e => e.major))
  }

  // Get the full program entry (authority info etc.)
  const getProgramEntry = (uii, program, major) => {
    if (!uii || !program) return null
    const entries = programsByUii.get(normalizeUii(uii)) || []
    // Try exact match with major first
    if (major && major !== '-') {
      const match = entries.find(e => e.program === program && e.major === major)
      if (match) return match
    }
    // Fall back to just program match
    return entries.find(e => e.program === program) || null
  }

  // ── Priority code data ──
  const priorityByProgram = useMemo(() => {
    if (!priorityRaw) return new Map()
    const m = new Map()
    priorityRaw.forEach(p => {
      const name = (p['PROGRAM NAME'] || '').trim()
      if (!name) return
      // Use first match (there can be duplicates)
      if (!m.has(name)) {
        m.set(name, {
          code: (p.CODE || '').trim(),
          psced: (p.PSCED || '').trim(),
          discipline: (p['PROGRAM DISCIPLINE '] || p['PROGRAM DISCIPLINE'] || '').trim(),
        })
      }
    })
    return m
  }, [priorityRaw])

  const getPriorityInfo = (programName) => {
    return priorityByProgram.get(programName) || null
  }

  // ── PSGC hierarchy ──
  const psgcData = useMemo(() => {
    if (!psgcRaw) return { provinces: [], municipalitiesByProvince: new Map(), brgyByMunicipality: new Map(), psgcMap: new Map() }

    const provinces = []
    const municipalitiesByProvince = new Map()
    const brgyByMunicipality = new Map()
    const psgcMap = new Map() // name → psgc code

    psgcRaw.forEach(entry => {
      const name = (entry.Name || '').trim()
      const psgc = (entry['10-digit PSGC'] || '').trim()
      const level = (entry['Geographic Level '] || entry['Geographic Level'] || '').trim().toLowerCase()

      if (level.startsWith('province')) {
        provinces.push({ name, psgc })
      } else if (level.startsWith('city') || level.startsWith('municipality')) {
        // Determine parent province from PSGC code (first 3 digits after removing region digit)
        // Province PSGC: XX0000000, Municipality: XXXXX0000
        const provCode = psgc.slice(0, 3) + '000000'
        // Find the exact province code by matching first 3 chars
        const provKey = psgc.slice(0, 3)
        if (!municipalitiesByProvince.has(provKey)) municipalitiesByProvince.set(provKey, [])
        municipalitiesByProvince.get(provKey).push({ name, psgc })
      } else if (level.startsWith('barangay')) {
        // Parent municipality from PSGC (first 6 digits)
        const munKey = psgc.slice(0, 6)
        if (!brgyByMunicipality.has(munKey)) brgyByMunicipality.set(munKey, [])
        brgyByMunicipality.get(munKey).push({ name, psgc })
      }

      psgcMap.set(name.toLowerCase(), psgc)
    })

    // Sort all lists alphabetically
    provinces.sort((a, b) => a.name.localeCompare(b.name))
    municipalitiesByProvince.forEach(v => v.sort((a, b) => a.name.localeCompare(b.name)))
    brgyByMunicipality.forEach(v => v.sort((a, b) => a.name.localeCompare(b.name)))

    return { provinces, municipalitiesByProvince, brgyByMunicipality, psgcMap }
  }, [psgcRaw])

  const getProvinces = () => psgcData.provinces

  const getMunicipalities = (provincePsgc) => {
    if (!provincePsgc) return []
    const key = String(provincePsgc).slice(0, 3)
    return psgcData.municipalitiesByProvince.get(key) || []
  }

  const getBarangays = (municipalityPsgc) => {
    if (!municipalityPsgc) return []
    const key = String(municipalityPsgc).slice(0, 6)
    return psgcData.brgyByMunicipality.get(key) || []
  }

  // ── ZIP codes ──
  const zipLookup = useMemo(() => {
    const m = new Map() // "province|municipality" → zip code
    if (zipProvincial) {
      zipProvincial.forEach(z => {
        const key = `${(z.Province || '').trim().toLowerCase()}|${(z['City/Municipality'] || '').trim().toLowerCase()}`
        m.set(key, (z['ZIP Code'] || '').trim())
      })
    }
    if (zipManila) {
      zipManila.forEach(z => {
        const key = `manila|${(z['Barangay/District'] || z.City || '').trim().toLowerCase()}`
        m.set(key, (z['ZIP Code'] || '').trim())
      })
    }
    return m
  }, [zipProvincial, zipManila])

  const getZipCode = (province, municipality) => {
    if (!province || !municipality) return null
    const key = `${province.trim().toLowerCase()}|${municipality.trim().toLowerCase()}`
    return zipLookup.get(key) || null
  }

  return {
    // Loading state
    isLoaded: !!(heiRaw && programsRaw && psgcRaw),
    // Institutions
    institutions,
    heiByUii,
    // Programs
    getProgramsForUii,
    getMajorsForProgram,
    getProgramEntry,
    // Priority
    getPriorityInfo,
    // Location
    getProvinces,
    getMunicipalities,
    getBarangays,
    // ZIP
    getZipCode,
  }
}
