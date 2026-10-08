import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet } from "react-native";

const BackdropContext = createContext(false);

export function SettledModal({ visible, onShow, children, ...props }) {
    const [mounted, setMounted] = useState(visible);
    const [backdropVisible, setBackdropVisible] = useState(false);
    const progress = useRef(new Animated.Value(1)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const activeAnimation = useRef(null);

    const animateOpen = () => {
        activeAnimation.current?.stop();
        progress.setValue(1);
        backdropOpacity.setValue(0);
        activeAnimation.current = Animated.sequence([
            Animated.timing(progress, {
                toValue: 0,
                duration: 460,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 160,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }),
        ]);
        activeAnimation.current.start(() => {
            activeAnimation.current = null;
        });
    };

    useEffect(() => {
        if (visible) {
            setMounted(true);
            setBackdropVisible(false);
            return undefined;
        }

        setBackdropVisible(false);
        const frame = requestAnimationFrame(() => setMounted(false));
        return () => cancelAnimationFrame(frame);
    }, [visible]);

    useEffect(() => () => activeAnimation.current?.stop(), []);

    return (
        <Modal
            {...props}
            animationType="none"
            visible={mounted}
            onShow={() => {
                setBackdropVisible(true);
                animateOpen();
                onShow?.();
            }}
        >
            <BackdropContext.Provider value={{ visible: backdropVisible && visible, backdropOpacity }}>
                <Animated.View
                    style={[
                        styles.content,
                        {
                            transform: [{
                                translateY: progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 700],
                                }),
                            }],
                        },
                    ]}
                >
                    {children}
                </Animated.View>
            </BackdropContext.Provider>
        </Modal>
    );
}

export function SettledBackdrop({ style, ...props }) {
    const context = useContext(BackdropContext);
    const visible = Boolean(context?.visible);
    return (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: context?.backdropOpacity ?? 0 }]}>
            <Pressable
                {...props}
                pointerEvents={visible ? "auto" : "none"}
                style={[style, !visible && styles.hidden]}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1 },
    hidden: { backgroundColor: "transparent" },
});
