import * as React from "react";
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';

import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FolderIcon from "@mui/icons-material/Folder";
import EditIcon from '@mui/icons-material/Edit';
import { Box, Checkbox, FormControl, Typography, Select, MenuItem, styled, TypographyProps, InputLabel, IconButton } from "@mui/material";
import { CLIModViewCommand, CLIModViewCommandGroup, CLIModViewCommandGroups, CLIModViewCommands, CLIModViewProfile } from "./CLIModuleCommon";
import { CLISpecsCommand, CLISpecsCommandGroup, CLISpecsSimpleCommand, CLISpecsSimpleCommandGroup, CLISpecsSimpleCommandTree } from "./CLIModuleGenerator";

const CommandGroupTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
    color: theme.palette.primary.main,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 17,
    fontWeight: 600,
}))

const CommandTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
    color: theme.palette.primary.main,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 20,
    fontWeight: 400,
}))

const SelectionTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
    color: theme.palette.grey[700],
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 15,
    fontWeight: 400,
}))

const RegisteredTypography = styled(SelectionTypography)<TypographyProps>(() => ({
}))

const UnregisteredTypography = styled(SelectionTypography)<TypographyProps>(() => ({
    color: '#d9c136',
}))


function useBatchedUpdate<T>(batchedUpdater: (states: T[]) => void, delay: number) {
    const [states, setStates] = React.useState<T[]>([]);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const batchedCallback = React.useCallback((state: T) => {
        setStates((prev) => [...prev, state]);
    }, []);

    React.useEffect(() => {
        if (states.length > 0) {
            timeoutRef.current = setTimeout(() => {
                batchedUpdater(states);
                setStates([]);
            }, delay);
        }

        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
            }
        }
    }, [states, batchedUpdater, delay]);

    return batchedCallback;
}


interface CommandItemProps {
    command: ProfileCTCommand,
    onUpdateCommand: (name: string, updater: (oldCommand: ProfileCTCommand) => ProfileCTCommand) => void,
}

const CommandItem: React.FC<CommandItemProps> = React.memo(({
    command,
    onUpdateCommand,
}) => {
    const leafName = command.names[command.names.length - 1];

    React.useEffect(() =>{if (command.selected === true && command.versions === undefined && command.loading === false) {
    }}, [])

    const selectCommand = React.useCallback((selected: boolean) => {
        onUpdateCommand(leafName, (oldCommand) => {
            return {
                ...oldCommand,
                selected: selected,
                selectedVersion: selected ? (oldCommand.selectedVersion ? oldCommand.selectedVersion : (oldCommand.versions ? oldCommand.versions[0].name : undefined)) : oldCommand.selectedVersion,
                modified: true,
            }
        });
    }, []);

    const selectVersion = React.useCallback((version: string) => {
        onUpdateCommand(leafName, (oldCommand) => {
            return {
                ...oldCommand,
                selectedVersion: version,
                modified: true,
            }
        });
    }, []);

    const selectRegistered = React.useCallback((registered: boolean) => {
        onUpdateCommand(leafName, (oldCommand) => {
            return {
                ...oldCommand,
                registered: registered,
                modified: true,
            }
        });
    }, []);

    return (
        <TreeItem sx={{ marginLeft: 2 }} key={command.id} nodeId={command.id} color='inherit' label={
            <Box sx={{
                marginTop: 1,
                marginBottom: 1,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
            }}>
                <Checkbox
                    disableRipple
                    checked={command.selected}
                    onClick={(event) => {
                        selectCommand(!command.selected);
                        event.stopPropagation();
                        event.preventDefault();
                    }}
                />
                <Box sx={{
                    marginLeft: 1,
                    minWidth: 100,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                }}>
                    <CommandTypography>{leafName}</CommandTypography>
                    <Box sx={{
                        marginLeft: 1,
                        width: 20,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        {!command.modified && command.selectedVersion !== undefined && <IconButton
                            onClick={(_event) => {
                                selectCommand(true);
                            }}
                        >
                            <EditIcon fontSize="small" color="disabled" />
                        </IconButton>}
                        {command.modified && <EditIcon fontSize="small" color="secondary" />}
                    </Box>
                </Box>
                {command.versions !== undefined && <Box sx={{
                    marginLeft: 1,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start"
                }}>
                    <FormControl sx={{
                        minWidth: 150,
                        marginLeft: 1,
                    }} size="small" variant="standard">
                        <InputLabel>Version</InputLabel>
                        <Select
                            id={`${command.id}-version-select`}
                            value={command.selectedVersion}
                            onChange={(event) => {
                                selectVersion(event.target.value);
                            }}
                            size="small"
                        >
                            {command.versions!.map((version) => (
                                <MenuItem value={version.name} key={`${command.id}-version-select-${version.name}`}>
                                    <SelectionTypography>{version.name}</SelectionTypography>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl sx={{
                        minWidth: 150,
                        marginLeft: 1,
                    }} size="small" variant="standard">
                        <InputLabel>Command table</InputLabel>
                        <Select
                            id={`${command.id}-register-select`}
                            value={command.registered ? 1 : 0}
                            onChange={(event) => {
                                selectRegistered(event.target.value === 1);
                            }}
                            size="small"
                        >
                            <MenuItem value={1} key={`${command.id}-register-select-registered`}>
                                <RegisteredTypography>Registered</RegisteredTypography>
                            </MenuItem>
                            <MenuItem value={0} key={`${command.id}-register-select-unregistered`}>
                                <UnregisteredTypography>Unregistered</UnregisteredTypography>
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Box>}
                {command.loading === true && command.selected && <Box sx={{
                    marginLeft: 1,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start"
                }}>
                    <Typography variant="body2" color="textSecondary">Loading...</Typography>
                </Box>}
            </Box>}
            onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
            }}
        />
    );
});

interface CommandGroupItemProps {
    commandGroup: ProfileCTCommandGroup,
    onUpdateCommandGroup: (name: string, updater: (oldCommandGroup: ProfileCTCommandGroup) => ProfileCTCommandGroup) => void,
}

const CommandGroupItem: React.FC<CommandGroupItemProps> = React.memo(({
    commandGroup,
    onUpdateCommandGroup,
}) => {
    const nodeName = commandGroup.names[commandGroup.names.length - 1];
    const selected = commandGroup.selected ?? false;

    console.log("Rendering Command Group: ", commandGroup.id);

    const onUpdateCommand = React.useCallback((name: string, updater: (oldCommand: ProfileCTCommand) => ProfileCTCommand) => {
        onUpdateCommandGroup(nodeName, (oldCommandGroup) => {
            const commands = {
                ...oldCommandGroup.commands,
                [name]: updater(oldCommandGroup.commands![name]),
            };
            const selected = calculateSelected(commands, oldCommandGroup.commandGroups ?? {});
            return {
                ...oldCommandGroup,
                commands: commands,
                selected: selected,
            }
        });
    }, []);

    const onUpdateSubCommandGroup = React.useCallback((name: string, updater: (oldCommandGroup: ProfileCTCommandGroup) => ProfileCTCommandGroup) => {
        onUpdateCommandGroup(nodeName, (oldCommandGroup) => {
            const commandGroups = {
                ...oldCommandGroup.commandGroups,
                [name]: updater(oldCommandGroup.commandGroups![name]),
            }
            const commands = oldCommandGroup.commands;
            const selected = calculateSelected(commands ?? {}, commandGroups);
            return {
                ...oldCommandGroup,
                commandGroups: commandGroups,
                selected: selected,
            };
        });
    }, []);

    const updateCommandSelected = (command: ProfileCTCommand, selected: boolean): ProfileCTCommand => {
        if (selected === command.selected) {
            return command;
        }
        return {
            ...command,
            selected: selected,
            selectedVersion: selected ? (command.selectedVersion ? command.selectedVersion : (command.versions ? command.versions[0].name : undefined)) : command.selectedVersion,
            modified: true,
        }
    };

    const updateGroupSelected = (group: ProfileCTCommandGroup, selected: boolean): ProfileCTCommandGroup => {
        if (selected === group.selected) {
            return group;
        }
        const commands = group.commands ? Object.fromEntries(Object.entries(group.commands).map(([key, value]) => [key, updateCommandSelected(value, selected)]) ) : undefined;
        const commandGroups = group.commandGroups ? Object.fromEntries(Object.entries(group.commandGroups).map(([key, value]) => [key, updateGroupSelected(value, selected)]) ) : undefined;
        return {
            ...group,
            commands: commands,
            commandGroups: commandGroups,
            selected: selected,
        }
    }

    const selectCommandGroup = React.useCallback((names: string[], selected: boolean) => {
        onUpdateCommandGroup(nodeName, (oldCommandGroup) => {
            return updateGroupSelected(oldCommandGroup, selected);
        });
    }, []);

    return (
        <TreeItem sx={{ marginLeft: 2, marginTop: 0.5 }} key={commandGroup.id} nodeId={commandGroup.id} color='inherit' label={
            <Box sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
            }}>
                <Checkbox
                    disableRipple
                    checked={commandGroup.selected !== false}
                    indeterminate={commandGroup.selected === undefined}
                    onClick={(event) => {
                        selectCommandGroup(commandGroup.names, !selected);
                        event.stopPropagation();
                        event.preventDefault();
                    }}
                />
                <FolderIcon />
                <CommandGroupTypography sx={{ marginLeft: 1 }}>{nodeName}</CommandGroupTypography>
            </Box>}
        >
            {commandGroup.commands !== undefined && Object.values(commandGroup.commands).map((command) => (
                <CommandItem
                    key={command.id}
                    command={command}
                    onUpdateCommand={onUpdateCommand}
                />
            ))}
            {commandGroup.commandGroups !== undefined && Object.values(commandGroup.commandGroups).map((group) => (
                <CommandGroupItem
                    key={group.id}
                    commandGroup={group}
                    onUpdateCommandGroup={onUpdateSubCommandGroup}
                />
            ))}
        </TreeItem>
    );
});

interface CLIModGeneratorProfileCommandTreeProps {
    profile?: string,
    profileCommandTree: ProfileCommandTree,
    onChange: (updater: ((oldProfileCommandTree: ProfileCommandTree) => ProfileCommandTree) | ProfileCommandTree) => void,
    onLoadCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>,
    onLoadCommand: (names: string[]) => Promise<CLISpecsCommand>,
}

const CLIModGeneratorProfileCommandTree: React.FC<CLIModGeneratorProfileCommandTreeProps> = ({
    profile,
    profileCommandTree,
    onChange,
    onLoadCommandGroup,
    onLoadCommand,
}) => {
    const [expanded, setExpanded] = React.useState<string[]>([]);

    React.useEffect(() => {
        setExpanded(GetDefaultExpanded(profileCommandTree));
    }, [profile]);

    const handleToggle = (_event: React.ChangeEvent<{}>, nodeIds: string[]) => {
        setExpanded(nodeIds);
    };

    const onUpdateCommandGroup = React.useCallback((name: string, updater: (oldCommandGroup: ProfileCTCommandGroup) => ProfileCTCommandGroup) => {
        onChange((profileCommandTree) => {
            return {
                ...profileCommandTree,
                commandGroups: {
                    ...profileCommandTree.commandGroups,
                    [name]: updater(profileCommandTree.commandGroups[name]),
                }
            }
        });
    }, []);

    const onLoadedCommandGroup = React.useCallback((commandGroup: CLISpecsCommandGroup) => {
        const names = commandGroup.names;
        onChange((profileCommandTree) => {
            return genericUpdateCommandGroup(profileCommandTree, names, (unloadedCommandGroup) => {
                const newCommandGroup = decodeProfileCTCommandGroup(commandGroup, unloadedCommandGroup.selected)
                if (newCommandGroup.selected) {
                    // TODO: 
                    return loadAllNextLevel(newCommandGroup, onLoadCommand, onLoadCommandGroup, onLoadedCommand, onLoadedCommandGroup);
                }
                return newCommandGroup
            })!;
        });
    }, [onChange]);

    const handleBatchedLoadedCommand = React.useCallback((commands: CLISpecsCommand[]) => {
        onChange((profileCommandTree) => {
            return commands.reduce((tree, command) => {
                return genericUpdateCommand(tree, command.names, (unloadedCommand) => {
                    return decodeProfileCTCommand(command, unloadedCommand.selected, unloadedCommand.modified);
                }) ?? tree;
            }, profileCommandTree);
        })
    }, []);

    const onLoadedCommand = useBatchedUpdate(handleBatchedLoadedCommand, 100);

    return (
        <React.Fragment>
            <TreeView
                disableSelection={true}
                expanded={expanded}
                onNodeToggle={handleToggle}
                // defaultExpanded={GetDefaultExpanded(profileCommandTree)}
                defaultCollapseIcon={<ArrowDropDownIcon />}
                defaultExpandIcon={<ArrowRightIcon />}
            >
                {Object.values(profileCommandTree.commandGroups).map((commandGroup) => (
                    <CommandGroupItem
                        key={commandGroup.id}
                        commandGroup={commandGroup}
                        onUpdateCommandGroup={onUpdateCommandGroup}
                    />
                ))}
            </TreeView>
        </React.Fragment>
    );
}

interface ProfileCommandTree {
    name: string;
    commandGroups: ProfileCTCommandGroups;
}

interface ProfileCTCommandGroups {
    [name: string]: ProfileCTCommandGroup;
}

interface ProfileCTCommands {
    [name: string]: ProfileCTCommand;
}

interface ProfileCTCommandGroup {
    id: string;
    names: string[];
    // We use simple command tree now.
    // `help` is not used.
    // help: string;

    commandGroups?: ProfileCTCommandGroups;
    commands?: ProfileCTCommands;
    waitCommand?: CLIModViewCommand;

    loading: boolean;
    selected?: boolean;
}

function isUnloadedCommandGroup(commandGroup: ProfileCTCommandGroup): boolean {
    return commandGroup.commands === undefined && commandGroup.loading === false;
}

interface ProfileCTCommand {
    id: string;
    names: string[];
    // help: string;

    versions?: ProfileCTCommandVersion[];

    selectedVersion?: string;
    registered?: boolean;
    modified: boolean;

    loading: boolean;
    selected: boolean;
}

function isUnloadedCommand(command: ProfileCTCommand): boolean {
    return command.selectedVersion === undefined && command.loading === false;
}

interface ProfileCTCommandVersion {
    name: string;
    stage: string;
}

function decodeProfileCTCommandVersion(response: any): ProfileCTCommandVersion {
    return {
        name: response.name,
        stage: response.stage,
    }
}


function decodeProfileCTCommand(response: CLISpecsCommand, selected: boolean = false, modified: boolean = false): ProfileCTCommand {
    const versions = response.versions?.map((value: any) => decodeProfileCTCommandVersion(value));
    const command = {
        id: response.names.join('/'),
        names: [...response.names],
        // help: response.help.short,
        versions: versions,
        modified: modified,
        loading: false,
        selected: selected,
    }
    if (selected) {
        const selectedVersion = versions ? versions[0].name : undefined;
        return {
            ...command,
            selectedVersion: selectedVersion,
        }
    } else {
        return command;
    }
}

function decodeProfileCTCommandGroup(response: CLISpecsCommandGroup, selected: boolean = false): ProfileCTCommandGroup {
    const commands = response.commands !== undefined ? Object.fromEntries(
        Object.entries(response.commands).map(([name, command]) => [name, decodeProfileCTCommand(command, selected, selected)])
    ) : undefined;
    const commandGroups = response.commandGroups !== undefined ? Object.fromEntries(
        Object.entries(response.commandGroups).map(([name, group]) => [name, decodeProfileCTCommandGroup(group, selected)])
    ) : undefined;
    return {
        id: response.names.join('/'),
        names: [...response.names],
        // help: response.help?.short ?? '',
        commandGroups: commandGroups,
        commands: commands,
        loading: false,
        selected: selected,
    }
}

function BuildProfileCommandTree(profileName: string, response: CLISpecsCommandGroup): ProfileCommandTree {
    const commandGroups = response.commandGroups !== undefined ? Object.fromEntries(
        Object.entries(response.commandGroups).map(([name, group]) => [name, decodeProfileCTCommandGroup(group)])
    ) : {};
    return {
        name: profileName,
        commandGroups: commandGroups,
    }
}

function getDefaultExpandedOfCommandGroup(commandGroup: ProfileCTCommandGroup): string[] {
    const expandedIds = commandGroup.commandGroups ? Object.values(commandGroup.commandGroups).flatMap(value => value.selected !== false ? [value.id, ...getDefaultExpandedOfCommandGroup(value)] : []) : [];
    return expandedIds;
}

function GetDefaultExpanded(tree: ProfileCommandTree): string[] {
    return Object.values(tree.commandGroups).flatMap(value => {
        const ids = getDefaultExpandedOfCommandGroup(value);
        if (value.selected !== false) {
            ids.push(value.id);
        }
        return ids;
    });
}

function findCommandGroup(tree: ProfileCommandTree, names: string[]): ProfileCTCommandGroup | undefined {
    if (names.length === 0) {
        return undefined;
    }
    let cg: ProfileCTCommandGroup | ProfileCommandTree = tree;
    for (const name of names) {
        if (cg.commandGroups === undefined) {
            return undefined;
        }
        cg = cg.commandGroups[name];
    }
    return cg as ProfileCTCommandGroup;
}

function loadCommand(command: ProfileCTCommand, fetchCommand: (names: string[]) => Promise<CLISpecsCommand>, onLoadedCommand: (command: CLISpecsCommand) => void): ProfileCTCommand | undefined {
    if (isUnloadedCommand(command)) {
        fetchCommand(command.names).then(onLoadedCommand);
        return { ...command, loading: true };
    } else {
        return undefined;
    }
}

function loadCommandGroup(commandGroup: ProfileCTCommandGroup, fetchCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>, onLoadedCommandGroup: (commandGroup: CLISpecsCommandGroup) => void): ProfileCTCommandGroup | undefined {
    if (isUnloadedCommandGroup(commandGroup)) {
        fetchCommandGroup(commandGroup.names).then(onLoadedCommandGroup);
        return { ...commandGroup, loading: true };
    } else {
        return undefined;
    }
}

function loadAllNextLevel(commandGroup: ProfileCTCommandGroup, fetchCommand: (names: string[]) => Promise<CLISpecsCommand>, fetchCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>, onLoadedCommand: (command: CLISpecsCommand) => void, onLoadedCommandGroup: (commandGroup: CLISpecsCommandGroup) => void): ProfileCTCommandGroup {
    if (isUnloadedCommandGroup(commandGroup)) {
        fetchCommandGroup(commandGroup.names).then(onLoadedCommandGroup);
        return { ...commandGroup, loading: true };
    } else {
        const commandGroups = commandGroup.commandGroups ? Object.fromEntries(Object.entries(commandGroup.commandGroups).map(([name, group]) => [name, loadAllNextLevel(group, fetchCommand, fetchCommandGroup, onLoadedCommand, onLoadedCommandGroup)])) : undefined;
        const commands = commandGroup.commands ? Object.fromEntries(Object.entries(commandGroup.commands).map(([name, command]) => [name, loadCommand(command, fetchCommand, onLoadedCommand) ?? command])) : undefined;
        return { ...commandGroup, commandGroups: commandGroups, commands: commands };
    }
}

function genericUpdateCommand(tree: ProfileCommandTree, names: string[], updater: (command: ProfileCTCommand) => ProfileCTCommand | undefined): ProfileCommandTree | undefined {
    let nodes: ProfileCTCommandGroup[] = [];
    for (const name of names.slice(0, -1)) {
        const node = nodes.length === 0 ? tree : nodes[nodes.length - 1];
        if (node.commandGroups === undefined) {
            throw new Error("Invalid names: " + names.join(' '));
        }
        nodes.push(node.commandGroups[name]);
    }
    let currentCommandGroup = nodes[nodes.length - 1];
    const updatedCommand = updater(currentCommandGroup.commands![names[names.length - 1]]);
    if (updatedCommand === undefined) {
        return undefined;
    }
    const commands = {
        ...currentCommandGroup.commands,
        [names[names.length - 1]]: updatedCommand,
    };
    const groupSelected = calculateSelected(commands, currentCommandGroup.commandGroups!);
    currentCommandGroup = {
        ...currentCommandGroup,
        commands: commands,
        selected: groupSelected,
    };
    for (const node of nodes.reverse().slice(1)) {
        const commandGroups = {
            ...node.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
        const selected = calculateSelected(node.commands ?? {}, commandGroups);
        currentCommandGroup = {
            ...node,
            commandGroups: commandGroups,
            selected: selected,
        }
    }
    return {
        ...tree,
        commandGroups: {
            ...tree.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
    }
}

function genericUpdateCommandGroup(tree: ProfileCommandTree, names: string[], updater: (commandGroup: ProfileCTCommandGroup) => ProfileCTCommandGroup | undefined): ProfileCommandTree | undefined {
    let nodes: ProfileCTCommandGroup[] = [];
    for (const name of names) {
        const node = nodes.length === 0 ? tree : nodes[nodes.length - 1];
        if (node.commandGroups === undefined) {
            throw new Error("Invalid names: " + names.join(' '));
        }
        nodes.push(node.commandGroups[name]);
    }
    let currentCommandGroup = nodes[nodes.length - 1];
    const updatedCommandGroup = updater(currentCommandGroup);
    if (updatedCommandGroup === undefined) {
        return undefined;
    }
    currentCommandGroup = updatedCommandGroup;
    for (const node of nodes.reverse().slice(1)) {
        const commandGroups = {
            ...node.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
        const selected = calculateSelected(node.commands ?? {}, commandGroups);
        currentCommandGroup = {
            ...node,
            commandGroups: commandGroups,
            selected: selected,
        }
    }
    return {
        ...tree,
        commandGroups: {
            ...tree.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
    }
}

function calculateSelected(commands: ProfileCTCommands, commandGroups: ProfileCTCommandGroups): boolean | undefined {
    const commandsAllSelected = Object.values(commands).reduce((pre, value) => { return pre && value.selected }, true);
    const commandsAllUnselected = Object.values(commands).reduce((pre, value) => { return pre && !value.selected }, true);
    const commandGroupsAllSelected = Object.values(commandGroups).reduce((pre, value) => { return pre && value.selected === true }, true);
    const commandGroupsAllUnselected = Object.values(commandGroups).reduce((pre, value) => { return pre && value.selected === false }, true);
    if (commandsAllUnselected && commandGroupsAllUnselected) {
        return false;
    } else if (commandsAllSelected && commandGroupsAllSelected) {
        return true;
    } else {
        return undefined;
    }
}

function updateCommand(command: ProfileCTCommand, selected: boolean, version: string | undefined, registered: boolean | undefined): ProfileCTCommand {
    if (selected) {
        return {
            ...command,
            selectedVersion: version ?? command.selectedVersion ?? (command.versions !== undefined ? command.versions[0].name : undefined),
            registered: registered ?? command.registered ?? true,
            selected: true,
            modified: true,
        }
    } else {
        return {
            ...command,
            selectedVersion: undefined,
            registered: undefined,
            selected: false,
            modified: true,
        }
    }
}

function updateCommandGroup(commandGroup: ProfileCTCommandGroup, names: string[], selected: boolean, version: string | undefined, registered: boolean | undefined): ProfileCTCommandGroup {
    if (names.length === 0) {
        const commands = commandGroup.commands ? Object.fromEntries(Object.entries(commandGroup.commands).map(([key, command]) => [key, updateCommand(command, selected, version, registered)])) : undefined;
        const commandGroups = commandGroup.commandGroups ? Object.fromEntries(Object.entries(commandGroup.commandGroups).map(([key, commandGroup]) => [key, updateCommandGroup(commandGroup, [], selected, version, registered)])) : undefined;
        const groupSelected = commands !== undefined && commandGroups !== undefined ? calculateSelected(commands, commandGroups): selected;
        return {
            ...commandGroup,
            commands: commands,
            commandGroups: commandGroups,
            selected: groupSelected,
        }
    } else {
        let name = names[0];
        if (name in (commandGroup.commandGroups ?? {})) {
            let subGroup = commandGroup.commandGroups![name];
            const commandGroups = {
                ...commandGroup.commandGroups,
                [name]: updateCommandGroup(subGroup, names.slice(1), selected, version, registered),
            }
            const commands = commandGroup.commands;
            const groupSelected = calculateSelected(commands ?? {}, commandGroups);
            return {
                ...commandGroup,
                commandGroups: commandGroups,
                selected: groupSelected,
            }
        } else if (name in (commandGroup.commands ?? {}) && names.length === 1) {
            let command = commandGroup.commands![name];
            const commands = {
                ...commandGroup.commands,
                [name]: updateCommand(command, selected, version, registered),
            }
            const commandGroups = commandGroup.commandGroups;
            const groupSelected = calculateSelected(commands, commandGroups ?? {});
            return {
                ...commandGroup,
                commands: commands,
                selected: groupSelected,
            }
        } else {
            throw new Error("Invalid names: " + names.join(' '));
        }
    }
}

function updateProfileCommandTree(tree: ProfileCommandTree, names: string[], selected: boolean, version: string | undefined = undefined, registered: boolean | undefined = undefined): ProfileCommandTree {
    const name = names[0];
    const commandGroup = tree.commandGroups[name];
    const commandGroups = {
        ...tree.commandGroups,
        [name]: updateCommandGroup(commandGroup, names.slice(1), selected, version, registered),
    }
    return {
        ...tree,
        commandGroups: commandGroups
    }
}

function initializeCommandByModView(view: CLIModViewCommand | undefined, simpleCommand: CLISpecsSimpleCommand): ProfileCTCommand {
    return {
        id: simpleCommand.names.join('/'),
        names: simpleCommand.names,
        modified: false,
        loading: true,
        selected: view !== undefined && view.version !== undefined,
        selectedVersion: view !== undefined ? view.version : undefined,
        registered: view !== undefined ? view.registered : undefined,
    }
}

function initializeCommandGroupByModView(view: CLIModViewCommandGroup | undefined, simpleCommandGroup: CLISpecsSimpleCommandGroup): ProfileCTCommandGroup {
    if (simpleCommandGroup.names === undefined) {
        console.log("simpleCommandGroup", simpleCommandGroup);
    }
    const commands = simpleCommandGroup.commands !== undefined ? Object.fromEntries(Object.entries(simpleCommandGroup.commands).map(([key, value]) => [key, initializeCommandByModView(view?.commands?.[key], value)]) ) : undefined;
    const commandGroups = simpleCommandGroup.commandGroups !== undefined ? Object.fromEntries(Object.entries(simpleCommandGroup.commandGroups).map(([key, value]) => [key, initializeCommandGroupByModView(view?.commandGroups?.[key], value)]) ) : undefined;
    const selected = calculateSelected(commands ?? {}, commandGroups ?? {});
    return {
        id: simpleCommandGroup.names.join('/'),
        names: simpleCommandGroup.names,
        commands: commands,
        commandGroups: commandGroups,
        waitCommand: view?.waitCommand,
        loading: false,
        selected: selected,
    }
}

function InitializeCommandTreeByModView(profileName: string, view: CLIModViewProfile | null, simpleTree: CLISpecsSimpleCommandTree): ProfileCommandTree {
    const commandGroups = Object.fromEntries(Object.entries(simpleTree.root.commandGroups).map(([key, value]) => [key, initializeCommandGroupByModView(view?.commandGroups?.[key], value)]));
    return {
        name: profileName,
        commandGroups: commandGroups,
    }
}

function ExportModViewCommand(command: ProfileCTCommand): CLIModViewCommand | undefined {
    if (command.selectedVersion === undefined) {
        return undefined
    }

    return {
        names: command.names,
        registered: command.registered!,
        version: command.selectedVersion!,
        modified: command.modified,
    }
}

function ExportModViewCommandGroup(commandGroup: ProfileCTCommandGroup): CLIModViewCommandGroup | undefined {
    if (commandGroup.selected === false) {
        return undefined
    }

    let commands: CLIModViewCommands | undefined = undefined;
    if (commandGroup.commands !== undefined) {
        commands = {}

        Object.values(commandGroup.commands!).forEach(value => {
            const view = ExportModViewCommand(value);
            if (view !== undefined) {
                commands![value.names[value.names.length - 1]] = view;
            }
        })
    }

    let commandGroups: CLIModViewCommandGroups | undefined = undefined;
    if (commandGroup.commandGroups !== undefined) {
        commandGroups = {}

        Object.values(commandGroup.commandGroups!).forEach(value => {
            const view = ExportModViewCommandGroup(value);
            if (view !== undefined) {
                commandGroups![value.names[value.names.length - 1]] = view;
            }
        })
    }
    return {
        names: commandGroup.names,
        commandGroups: commandGroups,
        commands: commands,
        waitCommand: commandGroup.waitCommand,
    }
}


function ExportModViewProfile(tree: ProfileCommandTree): CLIModViewProfile {
    const commandGroups: CLIModViewCommandGroups = {};

    Object.values(tree.commandGroups).forEach(value => {
        const view = ExportModViewCommandGroup(value);
        if (view !== undefined) {
            commandGroups[value.names[value.names.length - 1]] = view;
        }
    })

    return {
        name: tree.name,
        commandGroups: commandGroups
    }
}

export default CLIModGeneratorProfileCommandTree;

export type { ProfileCommandTree, }

export { InitializeCommandTreeByModView, BuildProfileCommandTree, ExportModViewProfile }
