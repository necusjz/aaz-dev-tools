import * as React from 'react';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, IconButton, Tooltip, Typography, TypographyProps } from '@mui/material';
import { styled } from '@mui/system';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';

interface CommandTreeLeaf {
    id: string
    names: string[]
}

interface CommandTreeNode {
    id: string
    names: string[]
    nodes?: CommandTreeNode[]
    leaves?: CommandTreeLeaf[]
    canDelete: boolean
}


interface WSEditorCommandTreeProps {
    commandTreeNodes: CommandTreeNode[]
    selected: string
    expanded: string[]
    onSelected: (nodeId: string) => void
    onToggle: (nodeIds: string[]) => void
    onAdd: () => void
    onReload: () => void
}


const HeaderTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
    color: theme.palette.primary.main,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 16,
    fontWeight: 600,
}))


class WSEditorCommandTree extends React.Component<WSEditorCommandTreeProps> {

    onNodeSelected = (event: React.SyntheticEvent, nodeIds: string[] | string) => {
        if (typeof nodeIds === 'string') {
            this.props.onSelected(nodeIds);
        }
    }

    onNodeToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
        this.props.onToggle(nodeIds);
    }

    render() {
        const { commandTreeNodes, selected, onAdd, onReload, expanded } = this.props;

        const renderLeaf = (leaf: CommandTreeLeaf) => {
            const leafName = leaf.names[leaf.names.length - 1];
            return (
                <TreeItem key={leaf.id} nodeId={leaf.id} color='inherit' label={leafName}
                    onClick={(event) => {
                        if (selected !== leaf.id) {
                            this.onNodeSelected(event, leaf.id);
                        }
                        event.stopPropagation();
                        event.preventDefault();
                    }}
                />
            )
        }

        const renderNode = (node: CommandTreeNode) => {
            const nodeName = node.names[node.names.length - 1];
            return (
                <TreeItem key={node.id} nodeId={node.id} color='inherit' label={nodeName}
                    onClick={(event) => {
                        if (selected !== node.id || expanded.indexOf(node.id) === -1) {
                            this.onNodeSelected(event, node.id);
                            this.onNodeToggle(event, [...expanded, node.id]);
                        } else {
                            this.onNodeToggle(event, expanded.filter(v => v !== node.id));
                        }
                        event.stopPropagation();
                        event.preventDefault();
                    }}
                >
                    {Array.isArray(node.leaves) ? node.leaves.map((leaf) => renderLeaf(leaf)) : null}
                    {Array.isArray(node.nodes) ? node.nodes.map((subNode) => renderNode(subNode)) : null}
                </TreeItem>
            )
        }

        return (
            <React.Fragment>
                <Box sx={{
                    mt: 2, ml: 4, mr: 2,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                }}>
                    <HeaderTypography>Command Tree</HeaderTypography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title='Reload Swagger Change'>
                        <IconButton
                            color='info'
                            onClick={onReload}
                            aria-label='reload'
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title='Add from Swagger'>
                        <IconButton
                            color='info'
                            onClick={onAdd}
                            aria-label='add'
                        >
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                <TreeView
                    defaultCollapseIcon={<ExpandMoreIcon />}
                    defaultExpandIcon={<ChevronRightIcon />}
                    selected={selected}
                    expanded={expanded}
                    sx={{
                        flexGrow: 1,
                        overflowY: 'auto',
                        mt: 1,
                        ml: 3,
                        mr: 3,
                    }}
                >
                    {commandTreeNodes.map((node) => renderNode(node))}
                </TreeView>
            </React.Fragment>
        )
    }

}

export default WSEditorCommandTree;

export type { CommandTreeNode, CommandTreeLeaf };
