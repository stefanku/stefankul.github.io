/**
 * CV Editor Vue Application
 */

const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

// Bilingual Input Component
const BilingualInput = {
    name: 'BilingualInput',
    props: {
        en: String,
        nl: String,
        label: String,
        placeholder: String,
        size: { type: String, default: 'normal' }
    },
    emits: ['update:en', 'update:nl'],
    template: `
        <div>
            <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">{{ label }}</label>
            <div class="flex border border-gray-300 rounded overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <button type="button" @click="activeLang = 'en'"
                        :class="['px-2 text-xs font-medium border-r transition-colors',
                                 activeLang === 'en' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
                    EN
                </button>
                <button type="button" @click="activeLang = 'nl'"
                        :class="['px-2 text-xs font-medium border-r transition-colors',
                                 activeLang === 'nl' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
                    NL
                </button>
                <input v-if="activeLang === 'en'"
                       :value="en"
                       @input="$emit('update:en', $event.target.value)"
                       :placeholder="placeholder"
                       :class="['flex-1 px-3 border-none focus:ring-0', size === 'small' ? 'py-1 text-sm' : 'py-2']">
                <input v-else
                       :value="nl"
                       @input="$emit('update:nl', $event.target.value)"
                       :placeholder="placeholder"
                       :class="['flex-1 px-3 border-none focus:ring-0', size === 'small' ? 'py-1 text-sm' : 'py-2']">
            </div>
        </div>
    `,
    setup() {
        const activeLang = ref('en');
        return { activeLang };
    }
};

// Bilingual Textarea Component
const BilingualTextarea = {
    name: 'BilingualTextarea',
    props: {
        en: String,
        nl: String,
        label: String,
        placeholder: String,
        rows: { type: Number, default: 3 }
    },
    emits: ['update:en', 'update:nl'],
    template: `
        <div>
            <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">{{ label }}</label>
            <div class="border border-gray-300 rounded overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <div class="flex bg-gray-100 border-b border-gray-300">
                    <button type="button" @click="activeLang = 'en'"
                            :class="['px-3 py-1 text-xs font-medium transition-colors',
                                     activeLang === 'en' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200']">
                        EN
                    </button>
                    <button type="button" @click="activeLang = 'nl'"
                            :class="['px-3 py-1 text-xs font-medium transition-colors',
                                     activeLang === 'nl' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200']">
                        NL
                    </button>
                </div>
                <textarea v-if="activeLang === 'en'"
                          :value="en"
                          @input="$emit('update:en', $event.target.value)"
                          :placeholder="placeholder"
                          :rows="rows"
                          class="w-full px-3 py-2 border-none focus:ring-0 resize-none text-sm"></textarea>
                <textarea v-else
                          :value="nl"
                          @input="$emit('update:nl', $event.target.value)"
                          :placeholder="placeholder"
                          :rows="rows"
                          class="w-full px-3 py-2 border-none focus:ring-0 resize-none text-sm"></textarea>
            </div>
        </div>
    `,
    setup() {
        const activeLang = ref('en');
        return { activeLang };
    }
};

// Bilingual List Component (for arrays like responsibilities, teaching items)
const BilingualList = {
    name: 'BilingualList',
    props: {
        en: Array,
        nl: Array,
        label: String
    },
    emits: ['update:en', 'update:nl'],
    template: `
        <div>
            <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">{{ label }}</label>
            <div class="border border-gray-300 rounded overflow-hidden">
                <div class="flex bg-gray-100 border-b border-gray-300">
                    <button type="button" @click="activeLang = 'en'"
                            :class="['px-3 py-1 text-xs font-medium transition-colors',
                                     activeLang === 'en' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200']">
                        EN
                    </button>
                    <button type="button" @click="activeLang = 'nl'"
                            :class="['px-3 py-1 text-xs font-medium transition-colors',
                                     activeLang === 'nl' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200']">
                        NL
                    </button>
                    <button type="button" @click="addItem"
                            class="ml-auto px-2 py-1 text-xs text-green-600 hover:bg-green-50">
                        + Add Item
                    </button>
                </div>
                <div class="p-2 space-y-2 max-h-64 overflow-y-auto">
                    <div v-for="(item, index) in currentList" :key="index"
                         class="flex items-start gap-2">
                        <span class="text-gray-400 mt-2 text-xs">{{ index + 1 }}.</span>
                        <textarea v-model="currentList[index]"
                                  @input="updateList"
                                  rows="2"
                                  class="flex-1 px-2 py-1 border border-gray-200 rounded text-sm resize-none focus:ring-1 focus:ring-primary"></textarea>
                        <button type="button" @click="removeItem(index)"
                                class="text-gray-400 hover:text-red-600 mt-1">
                            &#10005;
                        </button>
                    </div>
                    <div v-if="!currentList || currentList.length === 0"
                         class="text-center text-gray-400 text-sm py-4">
                        No items. Click "+ Add Item" to add one.
                    </div>
                </div>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const activeLang = ref('en');

        const currentList = computed({
            get() {
                return activeLang.value === 'en' ? (props.en || []) : (props.nl || []);
            },
            set(value) {
                if (activeLang.value === 'en') {
                    emit('update:en', value);
                } else {
                    emit('update:nl', value);
                }
            }
        });

        const updateList = () => {
            if (activeLang.value === 'en') {
                emit('update:en', [...currentList.value]);
            } else {
                emit('update:nl', [...currentList.value]);
            }
        };

        const addItem = () => {
            const newList = [...currentList.value, ''];
            if (activeLang.value === 'en') {
                emit('update:en', newList);
            } else {
                emit('update:nl', newList);
            }
        };

        const removeItem = (index) => {
            const newList = currentList.value.filter((_, i) => i !== index);
            if (activeLang.value === 'en') {
                emit('update:en', newList);
            } else {
                emit('update:nl', newList);
            }
        };

        return { activeLang, currentList, updateList, addItem, removeItem };
    }
};

console.log('app.js loaded, Vue available:', typeof Vue !== 'undefined');

// Main App
const app = createApp({
    components: {
        'bilingual-input': BilingualInput,
        'bilingual-textarea': BilingualTextarea,
        'bilingual-list': BilingualList
    },
    setup() {
        // State
        const loading = ref(true);
        const error = ref(null);
        const saving = ref(false);
        const generatingPDF = ref(false);
        const hasUnsavedChanges = ref(false);
        const previewLang = ref('en');
        const previewScale = ref(0.6);
        const toasts = ref([]);

        const data = reactive({
            personal: { name: '', credentials: '', location: '', phone: '', email: '', photo: '' },
            translations: { en: {}, nl: {} },
            profile: { en: '', nl: '' },
            experience: [],
            education: [],
            teaching: { en: [], nl: [] },
            publications: { books: [], book_chapters: [], articles: [], reports: [] },
            presentations: [],
            media_summary: { en: '', nl: '' },
            languages: { en: '', nl: '' },
            hobbies: { en: '', nl: '' },
            references: [],
            sectionVisibility: {
                profile: true,
                experience: true,
                education: true,
                teaching: true,
                publications: true,
                presentations: true,
                media_summary: true,
                languages: true,
                hobbies: true,
                references: true
            }
        });

        const expanded = reactive({
            exp: {},
            edu: {}
        });

        // Refs
        const previewFrame = ref(null);
        const experienceList = ref(null);
        const educationList = ref(null);

        // Debounce helper
        let previewTimeout = null;
        const debounce = (fn, delay) => {
            return (...args) => {
                clearTimeout(previewTimeout);
                previewTimeout = setTimeout(() => fn(...args), delay);
            };
        };

        // Toast helper
        const showToast = (message, type = 'success') => {
            const toast = { message, type };
            toasts.value.push(toast);
            setTimeout(() => {
                const index = toasts.value.indexOf(toast);
                if (index > -1) toasts.value.splice(index, 1);
            }, 3000);
        };

        // Load data
        const loadData = async () => {
            loading.value = true;
            error.value = null;
            try {
                console.log('Fetching data from /api/data...');
                const response = await fetch('/api/data');
                console.log('Response status:', response.status);
                if (!response.ok) throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
                const json = await response.json();
                console.log('Data loaded successfully:', Object.keys(json));

                // Merge with defaults
                Object.assign(data, json);

                // Ensure sectionVisibility exists
                if (!data.sectionVisibility) {
                    data.sectionVisibility = {
                        profile: true,
                        experience: true,
                        education: true,
                        teaching: true,
                        publications: true,
                        media_summary: true,
                        languages: true,
                        hobbies: true,
                        references: true
                    };
                }

                // Ensure bilingual objects have both languages
                data.profile = ensureBilingual(data.profile);
                data.media_summary = ensureBilingual(data.media_summary);
                data.languages = ensureBilingual(data.languages);
                data.hobbies = ensureBilingual(data.hobbies);
                data.teaching = ensureBilingual(data.teaching, true);

                // Ensure experience items have bilingual fields
                data.experience.forEach(job => {
                    job.title = ensureBilingual(job.title);
                    job.company = ensureBilingual(job.company);
                    job.location = ensureBilingual(job.location);
                    job.period = ensureBilingual(job.period);
                    job.responsibilities = ensureBilingual(job.responsibilities, true);
                });

                // Ensure education items have bilingual fields
                data.education.forEach(edu => {
                    edu.degree = ensureBilingual(edu.degree);
                    edu.institution = ensureBilingual(edu.institution);
                    edu.description = ensureBilingual(edu.description);
                });

                // Ensure references have bilingual titles
                data.references.forEach(ref => {
                    ref.title = ensureBilingual(ref.title);
                });

                // Ensure presentations have bilingual fields
                if (data.presentations) {
                    data.presentations.forEach(pres => {
                        pres.title = ensureBilingual(pres.title);
                        pres.role = ensureBilingual(pres.role);
                    });
                } else {
                    data.presentations = [];
                }

                // Prepare authors strings for display
                prepareAuthorsStrings();

                hasUnsavedChanges.value = false;
                await nextTick();
                initSortable();
                refreshPreview();
            } catch (err) {
                console.error('Error loading data:', err);
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        // Ensure bilingual object has both en and nl
        // Returns a proper bilingual object, creating one if input is null/undefined
        const ensureBilingual = (obj, isArray = false) => {
            if (!obj || typeof obj !== 'object') {
                return isArray ? { en: [], nl: [] } : { en: '', nl: '' };
            }
            if (obj.en === undefined) obj.en = isArray ? [] : '';
            if (obj.nl === undefined) obj.nl = isArray ? [] : '';
            return obj;
        };

        // Prepare authors strings for editing
        const prepareAuthorsStrings = () => {
            ['books', 'book_chapters', 'articles', 'reports'].forEach(type => {
                if (data.publications[type]) {
                    data.publications[type].forEach(pub => {
                        if (Array.isArray(pub.authors)) {
                            pub.authorsStr = pub.authors.join(', ');
                        }
                        if (Array.isArray(pub.editors)) {
                            pub.editorsStr = pub.editors.join(', ');
                        }
                    });
                }
            });
        };

        // Parse authors from string
        const parseAuthors = (item, event) => {
            const str = event.target.value;
            item.authors = str.split(',').map(s => s.trim()).filter(s => s);
            item.authorsStr = str;
        };

        // Parse editors from string
        const parseEditors = (item, event) => {
            const str = event.target.value;
            item.editors = str.split(',').map(s => s.trim()).filter(s => s);
            item.editorsStr = str;
        };

        // Save data
        const saveData = async () => {
            saving.value = true;
            try {
                // Clean up authors strings before saving
                const cleanData = JSON.parse(JSON.stringify(data));
                ['books', 'book_chapters', 'articles', 'reports'].forEach(type => {
                    if (cleanData.publications[type]) {
                        cleanData.publications[type].forEach(pub => {
                            delete pub.authorsStr;
                            delete pub.editorsStr;
                        });
                    }
                });

                const response = await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanData)
                });
                if (!response.ok) throw new Error('Failed to save data');
                hasUnsavedChanges.value = false;
                showToast('Data saved successfully');
            } catch (err) {
                showToast('Failed to save: ' + err.message, 'error');
            } finally {
                saving.value = false;
            }
        };

        // Refresh preview
        const refreshPreview = async () => {
            if (!previewFrame.value) return;

            try {
                // Clean data for preview
                const cleanData = JSON.parse(JSON.stringify(data));
                ['books', 'book_chapters', 'articles', 'reports'].forEach(type => {
                    if (cleanData.publications[type]) {
                        cleanData.publications[type].forEach(pub => {
                            delete pub.authorsStr;
                            delete pub.editorsStr;
                        });
                    }
                });

                const response = await fetch('/api/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: cleanData, lang: previewLang.value })
                });

                if (!response.ok) throw new Error('Preview failed');

                const html = await response.text();
                const iframe = previewFrame.value;
                iframe.srcdoc = html;
            } catch (err) {
                console.error('Preview error:', err);
            }
        };

        const debouncedRefreshPreview = debounce(refreshPreview, 500);

        // Generate PDF
        const generatePDF = async (lang) => {
            generatingPDF.value = true;
            try {
                // Clean data
                const cleanData = JSON.parse(JSON.stringify(data));
                ['books', 'book_chapters', 'articles', 'reports'].forEach(type => {
                    if (cleanData.publications[type]) {
                        cleanData.publications[type].forEach(pub => {
                            delete pub.authorsStr;
                            delete pub.editorsStr;
                        });
                    }
                });

                console.log('Requesting PDF generation for:', lang);
                const response = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: cleanData, lang })
                });

                console.log('Response status:', response.status, 'Content-Type:', response.headers.get('Content-Type'));

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('PDF generation error:', errorText);
                    throw new Error('PDF generation failed: ' + errorText);
                }

                const blob = await response.blob();
                console.log('PDF blob size:', blob.size, 'type:', blob.type);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cv_${data.personal.name.toLowerCase().replace(/\s+/g, '_')}_${lang}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast(`PDF (${lang.toUpperCase()}) generated successfully`);
            } catch (err) {
                showToast('Failed to generate PDF: ' + err.message, 'error');
            } finally {
                generatingPDF.value = false;
            }
        };

        // Upload photo
        const uploadPhoto = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('photo', file);

            try {
                const response = await fetch('/api/upload-photo', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Upload failed');

                const result = await response.json();
                data.personal.photo = result.path;
                hasUnsavedChanges.value = true;
                showToast('Photo uploaded successfully');
                debouncedRefreshPreview();
            } catch (err) {
                showToast('Failed to upload photo: ' + err.message, 'error');
            }
        };

        // Format section name
        const formatSectionName = (name) => {
            return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        };

        // Toggle expand
        const toggleExpand = (type, index) => {
            if (!expanded[type][index]) {
                expanded[type][index] = true;
            } else {
                expanded[type][index] = false;
            }
        };

        // Add experience
        const addExperience = () => {
            data.experience.unshift({
                visible: true,
                title: { en: '', nl: '' },
                company: { en: '', nl: '' },
                location: { en: '', nl: '' },
                period: { en: '', nl: '' },
                responsibilities: { en: [], nl: [] }
            });
            expanded.exp[0] = true;
            hasUnsavedChanges.value = true;
            nextTick(() => initSortable());
        };

        // Add education
        const addEducation = () => {
            data.education.unshift({
                visible: true,
                degree: { en: '', nl: '' },
                institution: { en: '', nl: '' },
                period: '',
                description: { en: '', nl: '' }
            });
            expanded.edu[0] = true;
            hasUnsavedChanges.value = true;
            nextTick(() => initSortable());
        };

        // Add reference
        const addReference = () => {
            data.references.push({
                visible: true,
                name: '',
                title: { en: '', nl: '' }
            });
            hasUnsavedChanges.value = true;
        };

        // Add presentation
        const addPresentation = () => {
            if (!data.presentations) data.presentations = [];
            data.presentations.unshift({
                visible: true,
                title: { en: '', nl: '' },
                event: '',
                location: '',
                date: '',
                type: 'conference',
                role: { en: 'Speaker', nl: 'Spreker' }
            });
            hasUnsavedChanges.value = true;
        };

        // Remove presentation
        const removePresentation = (index) => {
            if (confirm('Are you sure you want to remove this presentation?')) {
                data.presentations.splice(index, 1);
                hasUnsavedChanges.value = true;
            }
        };

        // Add publication
        const addPublication = (type) => {
            const templates = {
                books: { visible: true, authors: [], title: '', year: '', publisher: '', place: '', url: '' },
                book_chapters: { visible: true, authors: [], title: '', publication: '', year: '', publisher: '', editors: [] },
                articles: { visible: true, authors: [], title: '', publication: '', year: '', issue: '', pages: '' }
            };
            data.publications[type].unshift({ ...templates[type], authorsStr: '' });
            hasUnsavedChanges.value = true;
        };

        // Remove publication
        const removePublication = (type, index) => {
            if (confirm('Are you sure you want to remove this publication?')) {
                data.publications[type].splice(index, 1);
                hasUnsavedChanges.value = true;
            }
        };

        // Remove item
        const removeItem = (array, index) => {
            if (confirm('Are you sure you want to remove this item?')) {
                data[array].splice(index, 1);
                hasUnsavedChanges.value = true;
            }
        };

        // Duplicate item
        const duplicateItem = (array, index) => {
            const copy = JSON.parse(JSON.stringify(data[array][index]));
            data[array].splice(index + 1, 0, copy);
            hasUnsavedChanges.value = true;
            nextTick(() => initSortable());
        };

        // Initialize SortableJS
        const initSortable = () => {
            if (experienceList.value) {
                new Sortable(experienceList.value, {
                    handle: '.drag-handle',
                    animation: 150,
                    onEnd: (evt) => {
                        const item = data.experience.splice(evt.oldIndex, 1)[0];
                        data.experience.splice(evt.newIndex, 0, item);
                        hasUnsavedChanges.value = true;
                    }
                });
            }

            if (educationList.value) {
                new Sortable(educationList.value, {
                    handle: '.drag-handle',
                    animation: 150,
                    onEnd: (evt) => {
                        const item = data.education.splice(evt.oldIndex, 1)[0];
                        data.education.splice(evt.newIndex, 0, item);
                        hasUnsavedChanges.value = true;
                    }
                });
            }
        };

        // Watch for changes
        watch(data, () => {
            hasUnsavedChanges.value = true;
            debouncedRefreshPreview();
        }, { deep: true });

        watch(previewLang, () => {
            refreshPreview();
        });

        // Warn before leaving with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges.value) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges.value && !saving.value) {
                    saveData();
                }
            }
        });

        // Load on mount
        onMounted(() => {
            console.log('Vue app mounted, loading data...');
            loadData();
        });

        return {
            // State
            loading,
            error,
            saving,
            generatingPDF,
            hasUnsavedChanges,
            previewLang,
            previewScale,
            toasts,
            data,
            expanded,

            // Refs
            previewFrame,
            experienceList,
            educationList,

            // Methods
            loadData,
            saveData,
            refreshPreview,
            generatePDF,
            uploadPhoto,
            formatSectionName,
            toggleExpand,
            addExperience,
            addEducation,
            addReference,
            addPublication,
            removePublication,
            removeItem,
            duplicateItem,
            parseAuthors,
            parseEditors,
            addPresentation,
            removePresentation
        };
    }
});

app.mount('#app');
