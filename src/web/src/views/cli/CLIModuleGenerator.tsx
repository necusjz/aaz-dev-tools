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
import CLIModGeneratorProfileCommandTree, { BuildProfileCommandTree, ExportModViewProfile, ProfileCommandTree, UpdateProfileCommandTreeByModView } from "./CLIModGeneratorProfileCommandTree";
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

function isCLISpecsPartialCommand(obj: CLISpecsCommand) {
    return obj.versions === undefined;
}

interface CLISpecsCommandGroup {
    names: string[],
    help?: CLISpecsHelp,
    commands?: CLISpecsCommands,
    commandGroups?: CLISpecsCommandGroups,
}

function isCLISpecsPartialCommandGroup(obj: CLISpecsCommandGroup) {
    return obj.commands === undefined || obj.commandGroups === undefined;
}

interface CLISpecsCommandGroups {
    [name: string]: Promise<CLISpecsCommandGroup>|CLISpecsCommandGroup,
}

interface CLISpecsCommands {
    [name: string]: Promise<CLISpecsCommand>|CLISpecsCommand,
}

const useSpecsCommandTree = () => {
    const root: Promise<CLISpecsCommandGroup> = axios.get('/AAZ/Specs/CommandTree/Nodes/aaz').then(res => res.data);
    const commandTree = React.useRef({root: root});

    const ensuredCgOf = async (commandGroups: CLISpecsCommandGroups, name: string) => {
        let cg = commandGroups[name];
        if (cg instanceof Promise) {
            return await cg;
        } else if (isCLISpecsPartialCommandGroup(cg)) {
            let cg_promise = axios.get(`/AAZ/Specs/CommandTree/Nodes/aaz/${cg.names.join('/')}?limited=true`).then(res => res.data);
            commandGroups[name] = cg_promise;
            return await cg_promise;
        } else {
            return cg;
        }
    }

    const ensuredCommandOf = async (commands: CLISpecsCommands, name: string) => {
        let command = commands[name];
        if (command instanceof Promise) {
            return await command;
        } else if (isCLISpecsPartialCommand(command)) {
            let cg_names = command.names.slice(0, -1);
            let command_name = command.names[command.names.length - 1];
            let command_promise = axios.get(`/AAZ/Specs/CommandTree/Nodes/aaz/${cg_names.join('/')}/Leaves/${command_name}`).then(res => res.data);
            commands[name] = command_promise;
            return await command_promise
        } else {
            return command;
        }
    }

    const fetchCommandGroup = async (names: string[]) => {
        let node = await commandTree.current.root;
        for (const name of names) {
            node = await ensuredCgOf(node.commandGroups!, name);
        }
        return node;
    }

    const fetchCommand = async (names: string[]) => {
        let parent_cg = await fetchCommandGroup(names.slice(0, -1));
        return ensuredCommandOf(parent_cg.commands!, names[names.length - 1]);
    }

    return [fetchCommandGroup, fetchCommand];
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
    const [commandTrees, setCommandTrees] = React.useState<ProfileCommandTree[]>([]);
    const [selectedProfileIdx, setSelectedProfileIdx] = React.useState<number | undefined>(undefined);
    const [showGenerateDialog, setShowGenerateDialog] = React.useState(false);

    const [fetchCommandGroup, fetchCommand] = useSpecsCommandTree();

    React.useEffect(() => {
        loadModule();
    }, []);

    const loadModule = async () => {
        try {
            setLoading(true);
            let res = await axios.get(`/CLI/Az/Profiles`);
            let profiles: string[] = res.data;

            res = await axios.get(`/AAZ/Specs/CommandTree/Nodes/aaz`);
            let commandTrees: ProfileCommandTree[] = profiles.map((profileName) => BuildProfileCommandTree(profileName, res.data));

            res = await axios.get(`/CLI/Az/${params.repoName}/Modules/${params.moduleName}`);
            let modView: CLIModView = res.data;

            Object.keys(modView.profiles).forEach((profile) => {
                let idx = profiles.findIndex(v => v === profile);
                if (idx === -1) {
                    throw new Error(`Invalid profile ${profile}`);
                }
                commandTrees[idx] = UpdateProfileCommandTreeByModView(commandTrees[idx], modView.profiles[profile]);
            });

            let selectedProfileIdx = profiles.length > 0 ? 0 : undefined;
            setProfiles(profiles);
            setCommandTrees(commandTrees);
            setSelectedProfileIdx(selectedProfileIdx);
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

    const selectedCommandTree = selectedProfileIdx ? commandTrees[selectedProfileIdx] : undefined;

    const handleBackToHomepage = () => {
        window.open('/?#/cli', "_blank");
    };

    const handleGenerate = () => {
        setShowGenerateDialog(true);
    };

    const handleGenerationClose = (generated: boolean) => {
        setShowGenerateDialog(false);
    };

    const onProfileChange = (selectedIdx: number) => {
        setSelectedProfileIdx(selectedIdx);
    };

    const onSelectedProfileTreeUpdate = (newTree: ProfileCommandTree) => {
        setCommandTrees(commandTrees.map((value, idx) => (idx === selectedProfileIdx ? newTree : value)));
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
                    {selectedProfileIdx !== undefined && (
                        <CLIModGeneratorProfileTabs
                            value={selectedProfileIdx}
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
    profileCommandTrees: ProfileCommandTree[];
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
        props.profileCommandTrees.forEach(tree => {
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
                console.error(err.response);
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
        props.profileCommandTrees.forEach(tree => {
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
                console.error(err.response);
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

export { CLIModuleGeneratorWrapper as CLIModuleGenerator };
