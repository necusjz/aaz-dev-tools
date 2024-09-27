import * as React from "react";
import {
    Backdrop,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    LinearProgress,
    Toolbar,
    Alert,
} from "@mui/material";
import { useParams } from "react-router";
import axios from "axios";
import CLIModGeneratorToolBar from "./CLIModGeneratorToolBar";
import CLIModGeneratorProfileCommandTree, { ExportModViewProfile, InitializeCommandTreeByModView, ProfileCommandTree } from "./CLIModGeneratorProfileCommandTree";
import CLIModGeneratorProfileTabs from "./CLIModGeneratorProfileTabs";
import { CLIModView, CLIModViewProfiles } from "./CLIModuleCommon";


interface CLISpecsHelp {
    short: string,
    lines?: string[],
}

interface CLISpecsResource {
    plane: string,
    id: string,
    version: string,
    subresource?: string,
}

interface CLISpecsCommandExample {
    name: string,
    commands: string[],
}

interface CLISpecsCommandVersion {
    name: string,
    stage?: string,
    resources: CLISpecsResource[],
    examples?: CLISpecsCommandExample[],
}

interface CLISpecsCommand {
    names: string[],
    help: CLISpecsHelp,
    versions?: CLISpecsCommandVersion[],
}

interface CLISpecsCommandGroup {
    names: string[],
    help?: CLISpecsHelp,
    commands?: CLISpecsCommands,
    commandGroups?: CLISpecsCommandGroups,
}

interface CLISpecsCommandGroups {
    [name: string]: CLISpecsCommandGroup,
}

interface CLISpecsCommands {
    [name: string]: CLISpecsCommand,
}

const useSpecsCommandTree: () => [(names: string[]) => Promise<CLISpecsCommandGroup>, (names: string[]) => Promise<CLISpecsCommand>] = () => {
    const commandCache = React.useRef(new Map<string, Promise<CLISpecsCommand>>());
    const cgCache = React.useRef(new Map<string, Promise<CLISpecsCommandGroup>>());

    const fetchCommandGroup = async (names: string[]) => {
        const cachedPromise = cgCache.current.get(names.join('/'));
        const fullNames = ['aaz', ...names];
        const cgPromise: Promise<CLISpecsCommandGroup> = cachedPromise ?? axios.get(`/AAZ/Specs/CommandTree/Nodes/${fullNames.join('/')}?limited=true`).then(res => res.data);
        if (!cachedPromise) {
            cgCache.current.set(names.join('/'), cgPromise);
        }
        return await cgPromise;
    }

    const fetchCommand = async (names: string[]) => {
        const cachedPromise = commandCache.current.get(names.join('/'));
        const fullNames = ['aaz', ...names];
        const cgNames = fullNames.slice(0, -1);
        const commandName = fullNames[fullNames.length - 1];
        const commandPromise: Promise<CLISpecsCommand> = cachedPromise ?? axios.get(`/AAZ/Specs/CommandTree/Nodes/${cgNames.join('/')}/Leaves/${commandName}`).then(res => res.data);
        if (!cachedPromise) {
            commandCache.current.set(names.join('/'), commandPromise);
        }
        return await commandPromise;
    }

    return [fetchCommandGroup, fetchCommand];
}


interface ProfileCommandTrees {
    [name: string]: ProfileCommandTree,
}

interface CLIModuleGeneratorProps {
    params: {
        repoName: string;
        moduleName: string;
    };
}

const CLIModuleGenerator: React.FC<CLIModuleGeneratorProps> = ({ params }) => {
    const [loading, setLoading] = React.useState(false);
    const [invalidText, setInvalidText] = React.useState<string | undefined>(undefined);
    const [profiles, setProfiles] = React.useState<string[]>([]);
    const [commandTrees, setCommandTrees] = React.useState<ProfileCommandTrees>({});
    const [selectedProfile, setSelectedProfile] = React.useState<string | undefined>(undefined);
    const [showGenerateDialog, setShowGenerateDialog] = React.useState(false);

    const [fetchCommandGroup, fetchCommand] = useSpecsCommandTree();

    React.useEffect(() => {
        loadModule();
    }, []);

    const loadModule = async () => {
        try {
            setLoading(true);
            const profiles: string[] = await axios.get(`/CLI/Az/Profiles`).then(res => res.data);

            const modView: CLIModView = await axios.get(`/CLI/Az/${params.repoName}/Modules/${params.moduleName}`).then(res => res.data);

            Object.keys(modView!.profiles).forEach((profile) => {
                let idx = profiles.findIndex(v => v === profile);
                if (idx === -1) {
                    throw new Error(`Invalid profile ${profile}`);
                }
            });

            const commandTrees = Object.fromEntries(await Promise.all(profiles.map(async (profile) => {
                return InitializeCommandTreeByModView(profile, modView!.profiles[profile] ?? null, fetchCommandGroup, fetchCommand).then(tree => [profile, tree] as [string, ProfileCommandTree]);
            })));

            const selectedProfile = profiles.length > 0 ? profiles[0] : undefined;
            setProfiles(profiles);
            setCommandTrees(commandTrees);
            setSelectedProfile(selectedProfile);
            setLoading(false);
        } catch (err: any) {
            console.error(err);
            if (err.response?.data?.message) {
                const data = err.response!.data!;
                setInvalidText(`ResponseError: ${data.message!}`);
            } else {
                setInvalidText(`Error: ${err}`);
            }
            setLoading(false);
        }
    };

    const selectedCommandTree = selectedProfile ? commandTrees[selectedProfile] : undefined;

    const handleBackToHomepage = () => {
        window.open('/?#/cli', "_blank");
    };

    const handleGenerate = () => {
        setShowGenerateDialog(true);
    };

    const handleGenerationClose = () => {
        setShowGenerateDialog(false);
    };

    const onProfileChange = (selectedProfile: string) => {
        setSelectedProfile(selectedProfile);
    };

    const onSelectedProfileTreeUpdate = (updater: ((newTree: ProfileCommandTree) => ProfileCommandTree) | ProfileCommandTree) => {
        setCommandTrees((commandTrees) => {
            const selectedCommandTree = commandTrees[selectedProfile!];
            const newTree = typeof updater === 'function' ? updater(selectedCommandTree!) : updater;
            return { ...commandTrees, [selectedProfile!]: newTree }
        });
    };

    return (
        <React.Fragment>
            <CLIModGeneratorToolBar
                moduleName={params.moduleName}
                onHomePage={handleBackToHomepage}
                onGenerate={handleGenerate}
            />
            <Box sx={{ display: "flex" }}>
                <Drawer
                    variant="permanent"
                    sx={{
                        width: 300,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: { width: 300, boxSizing: "border-box" },
                    }}
                >
                    <Toolbar />
                    {selectedProfile !== undefined && (
                        <CLIModGeneratorProfileTabs
                            value={selectedProfile}
                            profiles={profiles}
                            onChange={onProfileChange}
                        />
                    )}
                </Drawer>
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 2,
                    }}
                >
                    <Toolbar sx={{ flexShrink: 0 }} />
                    {selectedCommandTree !== undefined && (
                        <CLIModGeneratorProfileCommandTree
                            profileCommandTree={selectedCommandTree}
                            onChange={onSelectedProfileTreeUpdate}
                            onLoadCommand={fetchCommand}
                            onLoadCommandGroup={fetchCommandGroup}
                        />
                    )}
                </Box>
            </Box>
            {showGenerateDialog && (
                <GenerateDialog
                    repoName={params.repoName}
                    moduleName={params.moduleName}
                    profileCommandTrees={commandTrees}
                    open={showGenerateDialog}
                    onClose={handleGenerationClose}
                />
            )}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme: any) => theme.zIndex.drawer + 1 }}
                open={loading}
            >
                {invalidText !== undefined ? (
                    <Alert
                        sx={{
                            maxWidth: "80%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            justifyContent: "flex-start",
                        }}
                        variant="filled"
                        severity='error'
                        onClose={() => {
                            setInvalidText(undefined);
                            setLoading(false);
                        }}
                    >
                        {invalidText}
                    </Alert>
                ) : (
                    <CircularProgress color='inherit' />
                )}
            </Backdrop>
        </React.Fragment>
    );
};

function GenerateDialog(props: {
    repoName: string;
    moduleName: string;
    profileCommandTrees: ProfileCommandTrees;
    open: boolean;
    onClose: (generated: boolean) => void;
}) {
    const [updating, setUpdating] = React.useState<boolean>(false);
    const [invalidText, setInvalidText] = React.useState<string | undefined>(
        undefined
    );

    const handleClose = () => {
        props.onClose(false);
    };

    const handleGenerateAll = () => {
        const profiles: CLIModViewProfiles = {};
        Object.values(props.profileCommandTrees).forEach(tree => {
            profiles[tree.name] = ExportModViewProfile(tree);
        })
        const data = {
            name: props.moduleName,
            profiles: profiles,
        }

        setUpdating(true);
        axios
            .put(
                `/CLI/Az/${props.repoName}/Modules/${props.moduleName}`,
                data
            )
            .then(() => {
                setUpdating(false);
                props.onClose(true);
            })
            .catch((err) => {
                console.error(err);
                if (err.response?.data?.message) {
                    const data = err.response!.data!;
                    setInvalidText(
                        `ResponseError: ${data.message!}: ${JSON.stringify(data.details)}`
                    );
                }
                setUpdating(false);
            });
    };

    const handleGenerateModified = () => {
        const profiles: CLIModViewProfiles = {};
        Object.values(props.profileCommandTrees).forEach(tree => {
            profiles[tree.name] = ExportModViewProfile(tree);
        })
        const data = {
            name: props.moduleName,
            profiles: profiles,
        }

        setUpdating(true);
        axios
            .patch(
                `/CLI/Az/${props.repoName}/Modules/${props.moduleName}`,
                data
            )
            .then(() => {
                setUpdating(false);
                props.onClose(true);
            })
            .catch((err) => {
                console.error(err);
                if (err.response?.data?.message) {
                    const data = err.response!.data!;
                    setInvalidText(
                        `ResponseError: ${data.message!}: ${JSON.stringify(data.details)}`
                    );
                }
                setUpdating(false);
            });
    }


    return (
        <Dialog disableEscapeKeyDown open={props.open}>
            <DialogTitle>Generate CLI commands to {props.moduleName}</DialogTitle>
            <DialogContent>
                {invalidText && <Alert variant="filled" severity="error"> {invalidText} </Alert>}
            </DialogContent>
            <DialogActions>
                {updating &&
                    <Box sx={{ width: "100%" }}>
                        <LinearProgress color="secondary" />
                    </Box>
                }
                {!updating && <React.Fragment>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleGenerateAll}>Generate All</Button>
                    <Button onClick={handleGenerateModified}>Generate Edited Only</Button>
                </React.Fragment>}
            </DialogActions>
        </Dialog>
    );
}

const CLIModuleGeneratorWrapper = (props: any) => {
    const params = useParams();
    return <CLIModuleGenerator params={params} {...props} />
}

export type { CLISpecsCommandGroup, CLISpecsCommand };
export { CLIModuleGeneratorWrapper as CLIModuleGenerator };
