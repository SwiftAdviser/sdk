import { Component, createSignal, onCleanup, onMount, Show, useContext } from 'solid-js';
import { ArrowIcon, Text, TonIcon } from 'src/app/components';
import { ConnectorContext } from 'src/app/state/connector.context';
import { TonConnectUiContext } from 'src/app/state/ton-connect-ui.context';
import { Account, toUserFriendlyAddress } from '@tonconnect/sdk';
import {
    AccountButtonStyled,
    DropdownButtonStyled,
    DropdownContainerStyled,
    DropdownStyled,
    LoaderButtonStyled,
    LoaderIconStyled,
    NotificationsStyled
} from './style';
import { Dynamic, Portal } from 'solid-js/web';
import { useFloating } from 'solid-floating-ui';
import { autoUpdate } from '@floating-ui/dom';
import { Transition } from 'solid-transition-group';
import { useTheme } from 'solid-styled-components';
import { CHAIN } from '@tonconnect/sdk';
import { globalStylesTag } from 'src/app/styles/global-styles';

interface AccountButtonProps {}

export const AccountButton: Component<AccountButtonProps> = () => {
    const theme = useTheme();
    const connector = useContext(ConnectorContext)!;
    const tonConnectUI = useContext(TonConnectUiContext)!;
    const [isOpened, setIsOpened] = createSignal(false);
    const [account, setAccount] = createSignal<Account | null>(connector.account);
    const [restoringProcess, setRestoringProcess] = createSignal<boolean>(true);

    let dropDownRef: HTMLDivElement | undefined;

    const [floating, setFloating] = createSignal<HTMLDivElement | undefined>();
    const [anchor, setAnchor] = createSignal<HTMLButtonElement | undefined>();

    const position = useFloating(anchor, floating, {
        whileElementsMounted: autoUpdate,
        placement: 'bottom-end'
    });

    const normalizedAddress = (): string => {
        const acc = account();
        if (acc) {
            const userFriendlyAddress = toUserFriendlyAddress(
                acc.address,
                acc.chain === CHAIN.TESTNET
            );
            return userFriendlyAddress.slice(0, 4) + '…' + userFriendlyAddress.slice(-4);
        }

        return '';
    };

    tonConnectUI.connectionRestored.then(() => setRestoringProcess(false));

    const unsubscribe = connector.onStatusChange(wallet => {
        if (!wallet) {
            setIsOpened(false);
            setAccount(null);
            return;
        }

        setAccount(wallet.account);
    });

    const onClick = (e: Event): void | boolean => {
        if (!account() || !isOpened()) {
            return;
        }
        const clickToButton = anchor()!.contains(e.target as Node);
        const clickToDropdown = dropDownRef!.contains(e.target as Node);

        if (!clickToButton && !clickToDropdown) {
            setIsOpened(false);
        }
    };

    onMount(() => {
        document.body.addEventListener('click', onClick);
    });

    onCleanup(() => {
        document.body.removeEventListener('click', onClick);
        unsubscribe();
    });

    return (
        <Dynamic component={globalStylesTag}>
            <Show when={restoringProcess()}>
                <LoaderButtonStyled disabled={true} data-tc-connect-button-loading="true">
                    <LoaderIconStyled />
                </LoaderButtonStyled>
            </Show>
            <Show when={!restoringProcess()}>
                <Show when={!account()}>
                    <AccountButtonStyled
                        onClick={() => tonConnectUI.connectWallet()}
                        data-tc-connect-button="true"
                    >
                        <TonIcon fill={theme.colors.connectButton.foreground} />
                        <Text
                            translationKey="button.connectWallet"
                            fontSize="15px"
                            lineHeight="18px"
                            fontWeight="590"
                            color={theme.colors.connectButton.foreground}
                        >
                            Connect wallet
                        </Text>
                    </AccountButtonStyled>
                </Show>
                <Show when={account()}>
                    <DropdownContainerStyled>
                        <DropdownButtonStyled
                            onClick={() => setIsOpened(v => !v)}
                            ref={setAnchor}
                            data-tc-dropdown-button="true"
                        >
                            <Text fontSize="15px" fontWeight="590" lineHeight="18px">
                                {normalizedAddress()}
                            </Text>
                            <ArrowIcon direction="bottom" />
                        </DropdownButtonStyled>
                        <Portal>
                            <tc-root
                                ref={setFloating}
                                style={{
                                    position: position.strategy,
                                    top: `${position.y ?? 0}px`,
                                    left: `${position.x ?? 0}px`,
                                    'z-index': 999
                                }}
                                data-tc-dropdown-container="true"
                            >
                                <Transition
                                    onBeforeEnter={el => {
                                        el.animate(
                                            [
                                                { opacity: 0, transform: 'translateY(-8px)' },
                                                { opacity: 1, transform: 'translateY(0)' }
                                            ],
                                            {
                                                duration: 150
                                            }
                                        );
                                    }}
                                    onExit={(el, done) => {
                                        const a = el.animate(
                                            [
                                                { opacity: 1, transform: 'translateY(0)' },
                                                { opacity: 0, transform: 'translateY(-8px)' }
                                            ],
                                            {
                                                duration: 150
                                            }
                                        );
                                        a.finished.then(done);
                                    }}
                                >
                                    <Show when={isOpened()}>
                                        <DropdownStyled
                                            hidden={!isOpened()}
                                            onClose={() => setIsOpened(false)}
                                            ref={dropDownRef}
                                        />
                                    </Show>
                                </Transition>
                                <NotificationsStyled />
                            </tc-root>
                        </Portal>
                    </DropdownContainerStyled>
                </Show>
            </Show>
        </Dynamic>
    );
};
