import { View, Text, Pressable, Animated, Modal, Image, TouchableOpacity, ActivityIndicator, Alert, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useRef, useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useDispatch, useSelector } from 'react-redux';
import { uploadDocument, clearUploadError } from '../../store/slices/dealsSlice';

function ProgressBar({ percentage }) {
    const animatedValue = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        animatedValue.setValue(0);
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [animatedValue, percentage]);
    const width = animatedValue.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    return (
        <View className="h-[6px] bg-[#E5E7EB] rounded-full overflow-hidden w-full">
            <Animated.View style={{ width, height: '100%', borderRadius: 9999 }}>
                <LinearGradient
                    colors={['#434EEC', '#434EEC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, borderRadius: 9999 }}
                />
            </Animated.View>
        </View>
    );
}

const normalizeDocStatus = (status) => String(status || '').toLowerCase();

const getDocStyles = (status) => {
    switch (normalizeDocStatus(status)) {
        case "verified": return { badgeBg: "bg-[#E6F6ED]", badgeText: "text-[#22A559]", borderClass: "border-[#F3F4F6]" };
        case "pending": return { badgeBg: "bg-[#FFF8E6]", badgeText: "text-[#F59E0B]", borderClass: "border-[#F3F4F6]" };
        case "required": return { badgeBg: "bg-[#FEF2F2]", badgeText: "text-[#EF4444]", borderClass: "border-[#F3F4F6]" };
        default: return { badgeBg: "bg-[#F3F4F6]", badgeText: "text-[#6B7280]", borderClass: "border-[#F3F4F6]" };
    }
};

const statusLabel = (s) => {
    const status = normalizeDocStatus(s);
    return status ? status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
};

const getMimeType = (file = {}) => {
    const explicitType = file.mimeType || file.type;
    if (explicitType && explicitType.includes('/')) return explicitType;

    const fileName = String(file.name || file.fileName || '').toLowerCase();
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.png')) return 'image/png';
    if (fileName.endsWith('.webp')) return 'image/webp';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/pdf';
};

const getUploadDocumentType = (doc = {}) => {
    const rawType = String(doc.type || doc.category || '').trim().toLowerCase();
    if (!rawType || rawType.includes('kyc') || rawType.includes('identity')) return 'kyc';

    const token = rawType.replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return token.slice(0, 50) || 'document';
};

const TabDocuments = memo(function TabDocuments({ documents = [], dealId }) {
    const [uploaded, setUploaded] = useState({});
    const [viewer, setViewer] = useState(null);
    const [uploadingDocId, setUploadingDocId] = useState(null);
    const dispatch = useDispatch();
    const { uploading } = useSelector((s) => s.deals);

    useEffect(() => {
        if (globalThis.__DEV__ === false) return;
        console.log('[DealDocumentUpload] Documents tab props', {
            dealId,
            documentsCount: documents.length,
            documentIds: documents.map((doc) => doc.id).slice(0, 10),
        });
    }, [dealId, documents]);

    // Fixed KYC docs always shown
    const STATIC_KYC = [
        { id: 'kyc_aadhaar', title: 'Aadhaar Card', icon: 'id-card', status: 'required', category: 'IDENTITY & KYC' },
        { id: 'kyc_address', title: 'Address Proof', icon: 'home-outline', status: 'required', category: 'IDENTITY & KYC' },
    ];

    const isKycCategory = (d) => {
        const category = String(d.category || d.type || '').toLowerCase();
        return category === 'kyc' || category === 'identity & kyc';
    };

    // Replace static entry with API version if name matches
    const mergedKyc = STATIC_KYC.map(staticDoc => {
        const fromApi = documents.find(d =>
            isKycCategory(d) &&
            (d.name ?? d.title ?? '').toLowerCase().includes(staticDoc.title.split(' ')[0].toLowerCase())
        );
        return fromApi ?? staticDoc;
    });

    // API KYC docs that are NOT covered by static list (e.g. PAN Card) — append as-is
    const staticKeywords = STATIC_KYC.map(s => s.title.split(' ')[0].toLowerCase());
    const extraKycDocs = documents.filter(d =>
        isKycCategory(d) &&
        !staticKeywords.some(kw => (d.name ?? d.title ?? '').toLowerCase().includes(kw))
    );

    const kycSection = [...mergedKyc, ...extraKycDocs];

    // All non-kyc docs from API
    const otherDocs = documents.filter(d => !isKycCategory(d));

    const grouped = otherDocs.reduce((acc, doc) => {
        const key = doc.category ?? doc.type ?? 'DOCUMENTS';
        if (!acc[key]) acc[key] = [];
        acc[key].push(doc);
        return acc;
    }, {});
    grouped['IDENTITY & KYC'] = kycSection;

    const allDocs = [...otherDocs, ...kycSection];
    const verifiedCount = allDocs.filter(d => normalizeDocStatus(d.status) === 'verified').length;
    const completionPct = allDocs.length ? Math.round((verifiedCount / allDocs.length) * 100) : 0;

    const handleUpload = async (doc) => {
        dispatch(clearUploadError());
        let pickedFile = null;

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                pickedFile = {
                    uri: asset.uri,
                    name: asset.name ?? asset.fileName ?? doc.title ?? doc.name ?? 'document',
                    type: getMimeType(asset),
                };
            }
        } catch (error) {
            Alert.alert('Upload Failed', error?.message || 'Unable to open file picker. Please try again.');
            return;
        }

        if (!pickedFile || !dealId) return;

        try {
            if (globalThis.__DEV__ !== false) {
                console.log('[DealDocumentUpload] UI dispatch', {
                    dealId,
                    documentId: doc.id,
                    documentName: doc.title ?? doc.name,
                    uploadType: getUploadDocumentType(doc),
                    fileName: pickedFile.name,
                    fileType: pickedFile.type,
                    documentsCount: documents.length,
                });
            }
            setUploadingDocId(doc.id);
            const savedDoc = await dispatch(uploadDocument({
                dealId,
                name: doc.title ?? doc.name ?? pickedFile.name,
                type: getUploadDocumentType(doc),
                file: pickedFile,
            })).unwrap();
            setUploaded((prev) => ({
                ...prev,
                [doc.id]: pickedFile,
                [savedDoc?.data?.document?.id || savedDoc?.data?.id]: pickedFile,
            }));
        } catch (error) {
            Alert.alert('Upload Failed', error || 'Unable to upload this document. Please try again.');
        } finally {
            setUploadingDocId(null);
        }
    };

    return (
        <View className="mb-4">
            <View
                className="bg-white rounded-[12px] px-4 py-4 mb-3 shadow-sm border border-[#F3F4F6]"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
            >
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-[14px] font-manrope-bold text-[#111827]">Document Completion</Text>
                    <Text className="text-[11px] font-manrope-bold text-[#22A559]">{verifiedCount} / {allDocs.length} Verified</Text>
                </View>
                <ProgressBar percentage={completionPct} />
            </View>

            {Object.entries(grouped).map(([sectionTitle, docs], sIndex) => (
                <View key={`doc-section-${sIndex}`}>
                    <Text className="text-[10px] font-manrope-bold text-[#9CA3AF] uppercase tracking-widest mt-4 mb-2">
                        {sectionTitle}
                    </Text>
                    {docs.map((doc) => {
                        const styles = getDocStyles(doc.status);
                        const file = uploaded[doc.id];
                        // viewable: locally picked file OR already uploaded URL from server
                        const serverUri = doc.file_url || doc.url || null;
                        const viewUri = file?.uri ?? serverUri;
                        const viewType = file?.type ?? doc.type ?? (serverUri?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'pdf');
                        const viewName = file?.name ?? doc.name ?? doc.title ?? 'Document';
                        const docStatus = normalizeDocStatus(doc.status);
                        const isUploadable = false;
                        return (
                            <View
                                key={`doc-item-${doc.id}`}
                                className={`flex-row items-center p-3 bg-white rounded-[12px] mb-2.5 border ${styles.borderClass}`}
                            >
                                <View className="w-[36px] h-[36px] rounded-[8px] bg-[#EAF2FF] items-center justify-center mr-3">
                                    <Ionicons name={doc.icon ?? 'document-text'} size={18} color="#8DA4D4" />
                                </View>
                                <View className="flex-1 justify-center">
                                    <Text className="text-[13px] font-manrope-bold text-[#111827] mb-0.5">
                                        {file ? file.name : (doc.name ?? doc.title)}
                                    </Text>
                                    <Text className="text-[11px] font-manrope-medium text-[#9CA3AF] mb-1">
                                        {file ? 'Uploaded' : (doc.meta ?? doc.file_size ?? '')}
                                    </Text>
                                    <View className={`self-start px-2 py-[2px] rounded-[4px] ${file ? 'bg-[#E6F6ED]' : styles.badgeBg}`}>
                                        <Text className={`text-[9px] font-manrope-bold ${file ? 'text-[#22A559]' : styles.badgeText}`}>
                                            {file ? 'Uploaded' : statusLabel(doc.status)}
                                        </Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-[4px]">
                                    <Pressable
                                        onPress={() => viewUri && setViewer({ uri: viewUri, type: viewType, name: viewName })}
                                        className="w-[28px] h-[28px] rounded-[8px] items-center justify-center"
                                        style={{ backgroundColor: viewUri ? '#EEF2FF' : '#F1F3FF' }}
                                    >
                                        <Ionicons name="eye" size={14} color={viewUri ? '#4A43EC' : '#6B7280'} />
                                    </Pressable>
                                    {isUploadable ? (
                                        <Pressable
                                            onPress={() => handleUpload(doc)}
                                            disabled={uploading}
                                            className="w-[28px] h-[28px] bg-[#F1F3FF] rounded-[8px] items-center justify-center"
                                        >
                                            {(uploading && uploadingDocId === doc.id) ? (
                                                <ActivityIndicator size={12} color="#4F48ED" />
                                            ) : (
                                                <Ionicons name="cloud-upload-outline" size={15} color={file ? '#22A559' : '#8DA4D4'} />
                                            )}
                                        </Pressable>
                                    ) : (
                                        <Pressable className="w-[28px] h-[28px] bg-[#F1F3FF] rounded-[8px] items-center justify-center">
                                            <Ionicons name="arrow-down-circle" size={16} color="#8DA4D4" />
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            ))}

            <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => setViewer(null)}
                        style={{ position: 'absolute', top: 52, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                    {viewer && (
                        (() => {
                            const isImage =
                                viewer.type === 'image' ||
                                viewer.type?.startsWith('image/') ||
                                viewer.uri?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            return isImage ? (
                                <Image
                                    source={{ uri: viewer.uri }}
                                    style={{ width: '90%', height: '70%', borderRadius: 12 }}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={{ alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="document-text" size={64} color="#fff" />
                                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{viewer.name}</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>PDF preview not supported</Text>
                                </View>
                            );
                        })()
                    )}
                </View>
            </Modal>
        </View>
    );
});

export default TabDocuments;